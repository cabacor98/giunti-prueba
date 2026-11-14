from app.schemas import QuestionnaireResult, Item, Alternative


def test_schema_valid():
    data = {
        "titulo": "T",
        "idioma": "it",
        "total_items": 1,
        "items": [
            {
                "numero": 1,
                "enunciado": "Q?",
                "tipo": "seleccion_multiple",
                "alternativas": [{"valor": "A", "texto": "opt"}],
                "respuesta_correcta": "A",
            }
        ],
    }
    r = QuestionnaireResult.model_validate(data)
    assert r.total_items == 1
    assert r.items[0].respuesta_correcta == "A"


def test_total_items_auto_correct():
    data = {
        "titulo": "T",
        "idioma": "es",
        "total_items": 99,
        "items": [
            {"numero": 1, "enunciado": "Q?", "tipo": "desarrollo", "alternativas": [], "respuesta_correcta": None}
        ],
    }
    r = QuestionnaireResult.model_validate(data)
    assert r.total_items == 1


def test_invalid_tipo_rejected():
    import pytest
    from pydantic import ValidationError

    data = {
        "titulo": "T",
        "idioma": "en",
        "total_items": 1,
        "items": [{"numero": 1, "enunciado": "Q?", "tipo": "foo", "alternativas": [], "respuesta_correcta": None}],
    }
    with pytest.raises(ValidationError):
        QuestionnaireResult.model_validate(data)


def test_alternative_valor_types():
    a = Alternative(valor=0, texto="Mai")
    assert a.valor == 0
    a2 = Alternative(valor="A", texto="x")
    assert a2.valor == "A"
