from app.tools.base import BaseTool

_registry: dict[str, BaseTool] = {}


def register(tool: BaseTool) -> None:
    if tool.name in _registry:
        raise ValueError(f"Tool '{tool.name}' already registered")
    _registry[tool.name] = tool


def get(name: str) -> BaseTool:
    return _registry[name]


def all_schemas() -> list[dict]:
    return [t.to_openai_schema() for t in _registry.values()]


async def dispatch(name: str, inputs: dict) -> dict:
    return await get(name).run(**inputs)
