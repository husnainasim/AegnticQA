from abc import ABC, abstractmethod


class BaseTool(ABC):
    name: str
    description: str
    input_schema: dict

    @abstractmethod
    async def run(self, **kwargs) -> dict:
        ...

    def to_anthropic_schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }
