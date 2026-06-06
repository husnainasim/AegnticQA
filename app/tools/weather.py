import hashlib
import logging
import os

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.tools.base import BaseTool
from app.tools import register, _registry

logger = logging.getLogger("agentic_qa")

_CONDITIONS = ["sunny", "cloudy", "rainy", "snowy", "windy", "partly cloudy", "thunderstorm", "foggy"]
_OWM_URL = "https://api.openweathermap.org/data/2.5/weather"
_TIMEOUT = httpx.Timeout(8.0, connect=4.0)


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    reraise=False,
)
async def _fetch_owm(location: str, units: str) -> dict | None:
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                _OWM_URL,
                params={"q": location, "appid": api_key, "units": "metric"},
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            data = resp.json()
            temp_c = data["main"]["temp"]
            condition = data["weather"][0]["description"]
            humidity = data["main"]["humidity"]
            if units == "fahrenheit":
                temp = round(temp_c * 9 / 5 + 32, 1)
            else:
                temp = round(temp_c, 1)
            return {
                "location": data.get("name", location),
                "temperature": float(temp),
                "units": units,
                "condition": condition,
                "humidity": humidity,
                "source": "OpenWeatherMap",
            }
    except Exception as exc:
        logger.warning("OpenWeatherMap fetch failed for %s: %s", location, exc)
        return None


def _mock_weather(location: str, units: str) -> dict:
    seed = int(hashlib.md5(location.lower().encode()).hexdigest(), 16) & 0xFFFFFFFF
    # Realistic temperature ranges by rough geographic heuristic via city name hash
    # Range: -5 to 45°C — much wider than the old 5–34 range
    temp_c = (seed % 51) - 5
    condition = _CONDITIONS[seed % len(_CONDITIONS)]
    humidity = (seed % 60) + 30

    if units == "fahrenheit":
        temperature = round(temp_c * 9 / 5 + 32, 1)
    else:
        temperature = float(temp_c)

    return {
        "location": location,
        "temperature": temperature,
        "units": units,
        "condition": condition,
        "humidity": humidity,
        "source": "Mock Weather Service (set OPENWEATHER_API_KEY for live data)",
    }


class WeatherTool(BaseTool):
    name = "get_weather"
    description = (
        "Returns current weather conditions for a given location. "
        "Use for any weather-related questions."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "location": {"type": "string", "description": "City name, e.g. 'Lahore' or 'London, UK'"},
            "units": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "default": "celsius",
            },
        },
        "required": ["location"],
    }

    async def run(self, location: str, units: str = "celsius") -> dict:
        result = await _fetch_owm(location, units)
        if result is not None:
            return result
        return _mock_weather(location, units)


if "get_weather" not in _registry:
    register(WeatherTool())
