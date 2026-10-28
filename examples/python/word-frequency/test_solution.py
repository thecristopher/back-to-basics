import collections

import pytest

import solution
from solution import top_words


def counter_is_off(*args, **kwargs):
    raise AssertionError("Counter está desactivado, cuenta con un dict")


@pytest.fixture(autouse=True)
def no_counter(monkeypatch):
    monkeypatch.setattr(collections, "Counter", counter_is_off)
    monkeypatch.setattr(solution, "Counter", counter_is_off, raising=False)


def test_most_frequent_first():
    """pone primero la palabra que más se repite"""
    note = "Malenia ama el Haligtree. Malenia te ama, y tú amas a Malenia."
    assert top_words(note, 2) == [("malenia", 3), ("ama", 2)]


def test_ignores_case():
    """cuenta igual Malenia y MALENIA"""
    assert top_words("Malenia MALENIA malenia Torrent", 1) == [("malenia", 3)]


def test_ignores_punctuation():
    """no cuenta la puntuación como parte de la palabra"""
    assert top_words("¡runas! runas, runas.", 1) == [("runas", 3)]


def test_ties_are_alphabetical():
    """ordena alfabéticamente las palabras que empatan"""
    assert top_words("flor cita flor cita nota", 3) == [("cita", 2), ("flor", 2), ("nota", 1)]


def test_fewer_words_than_asked():
    """regresa las que haya cuando pides más de las que existen"""
    assert top_words("Melina Ranni", 5) == [("melina", 1), ("ranni", 1)]


def test_empty_text():
    """regresa una lista vacía para un texto vacío"""
    assert top_words("", 3) == []
