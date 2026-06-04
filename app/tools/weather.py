import hashlib

from app.tools.base import BaseTool
from app.tools import register, _registry

_CONDITIONS = ["sunny", "cloudy", "rainy", "snowy", "windy"]


class WeatherTool(BaseTool):
    name = "get_weather"
    description = "Returns current weather conditions for a given location. Use for weather-related questions."
    input_schema = {
        "type": "object",
        "properties": {
            "location": {"type": "string", "description": "City or location name"},
            "units": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "default": "celsius",
            },
        },
        "required": ["location"],
    }

    async def run(self, location: str, units: str = "celsius") -> dict:
        seed = int(hashlib.md5(location.lower().encode()).hexdigest(), 16) & 0xFFFFFFFF
        temperature = (seed % 30) + 5
        condition = _CONDITIONS[seed % len(_CONDITIONS)]
        humidity = (seed % 60) + 30

        if units == "fahrenheit":
            temperature = round(temperature * 9 / 5 + 32, 1)

        return {
            "location": location,
            "temperature": float(temperature),
            "units": units,
            "condition": condition,
            "humidity": humidity,
            "source": "Mock Weather Service v1",
        }


if "get_weather" not in _registry:
    register(WeatherTool())
