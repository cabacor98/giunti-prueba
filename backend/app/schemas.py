from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field, field_validator


TipoItem = Literal["escala_likert", "seleccion_multiple", "verdadero_falso", "desarrollo", "emparejamiento"]


class Alternative(BaseModel):
    valor: Union[int, str, None] = None
    texto: str


class Item(BaseModel):
    numero: int = Field(ge=1)
    enunciado: str = Field(min_length=1)
    tipo: TipoItem
    alternativas: List[Alternative] = Field(default_factory=list)
    respuesta_correcta: Optional[Union[str, int]] = None


class QuestionnaireResult(BaseModel):
    titulo: str = Field(min_length=1)
    idioma: str = Field(pattern=r"^[a-z]{2}$")
    total_items: int = Field(ge=0)
    items: List[Item] = Field(default_factory=list)

    @field_validator("total_items")
    @classmethod
    def check_total(cls, v, info):
        # allow 0 when no items; otherwise must match len(items) if items present
        return v

    def model_post_init(self, __context):
        if self.items and self.total_items != len(self.items):
            self.total_items = len(self.items)
