def top_words(text: str, n: int) -> list[tuple[str, int]]:
    """Las n palabras más frecuentes de text, con sus veces, de más a menos frecuente."""
    cleaned = "".join(char if char.isalpha() or char.isspace() else " " for char in text.lower())
    counts: dict[str, int] = {}
    for word in cleaned.split():
        counts[word] = counts.get(word, 0) + 1
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
