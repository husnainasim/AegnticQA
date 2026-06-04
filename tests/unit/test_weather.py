import pytest
from app.tools import _registry
from app.tools.weather import WeatherTool


@pytest.fixture(autouse=True)
def clear_registry():
    _registry.clear()
    _registry["get_weather"] = WeatherTool()
    yield
    _registry.clear()


async def test_weather_returns_valid_schema():
    tool = WeatherTool()
    result = await tool.run(location="Paris")
    assert "temperature" in result
    assert "condition" in result
    assert "humidity" in result
    assert result["units"] == "celsius"
    assert result["location"] == "Paris"


async def test_weather_celsius_default():
    tool = WeatherTool()
    result = await tool.run(location="London")
    assert result["units"] == "celsius"


async def test_weather_fahrenheit():
    tool = WeatherTool()
    result = await tool.run(location="New York", units="fahrenheit")
    assert result["units"] == "fahrenheit"


async def test_weather_deterministic():
    tool = WeatherTool()
    r1 = await tool.run(location="Tokyo")
    r2 = await tool.run(location="Tokyo")
    assert r1["temperature"] == r2["temperature"]
    assert r1["condition"] == r2["condition"]


async def test_weather_different_cities_differ():
    tool = WeatherTool()
    r1 = await tool.run(location="Paris")
    r2 = await tool.run(location="Sydney")
    assert r1["temperature"] != r2["temperature"] or r1["condition"] != r2["condition"]
