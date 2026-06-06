import pytest
from app.tools.base import BaseTool
from app.tools import register, get, dispatch, all_schemas, _registry


class EchoTool(BaseTool):
    name = "echo"
    description = "Echoes the input"
    input_schema = {
        "type": "object",
        "properties": {"text": {"type": "string"}},
        "required": ["text"],
    }

    async def run(self, **kwargs) -> dict:
        return {"echoed": kwargs["text"]}


def test_register_and_get():
    _registry.clear()
    tool = EchoTool()
    register(tool)
    assert get("echo") is tool


def test_duplicate_registration_raises():
    _registry.clear()
    register(EchoTool())
    with pytest.raises(ValueError, match="already registered"):
        register(EchoTool())


def test_all_schemas_format():
    _registry.clear()
    register(EchoTool())
    schemas = all_schemas()
    assert len(schemas) == 1
    s = schemas[0]
    assert s["type"] == "function"
    assert s["function"]["name"] == "echo"
    assert "parameters" in s["function"]
    assert s["function"]["description"] == "Echoes the input"


async def test_dispatch_calls_run():
    _registry.clear()
    register(EchoTool())
    result = await dispatch("echo", {"text": "hello"})
    assert result == {"echoed": "hello"}


def test_get_unknown_raises():
    _registry.clear()
    with pytest.raises(KeyError):
        get("nonexistent")
