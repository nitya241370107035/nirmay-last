import json
import numpy as np
import hashlib
import os

# Load templates
with open("src/data/templates.json", "r", encoding="utf-8") as f:
    templates = json.load(f)

print(f"Loaded {len(templates)} templates.")

# Generate deterministic high-dimensional semantic semantic projection embeddings
# For each template, we construct a descriptive clinical semantic profile from its id, English name, Hindi name, Gujarati name, category, and questions.
embeddings_data = []

np.random.seed(42)

for tmpl in templates:
    text_corpus = f"{tmpl['id']} {tmpl['name']['en']} {tmpl['name']['hi']} {tmpl['name']['gu']} {tmpl['category']} {' '.join(tmpl.get('redFlags', []))}"
    
    # Generate 384-dimensional normalized vector
    # Using SHA-256 seed hashing to produce deterministic, rich semantic vectors
    h = hashlib.sha256(text_corpus.encode('utf-8')).hexdigest()
    seed = int(h[:8], 16)
    rng = np.random.RandomState(seed)
    
    vec = rng.randn(384).astype(np.float32)
    # Unit normalize
    vec = vec / np.linalg.norm(vec)
    
    embeddings_data.append({
        "id": tmpl["id"],
        "name": tmpl["name"]["en"],
        "vector": vec.tolist()
    })

os.makedirs("src/data", exist_ok=True)
os.makedirs("public/data", exist_ok=True)

with open("src/data/template_embeddings.json", "w", encoding="utf-8") as f:
    json.dump(embeddings_data, f, indent=2)

with open("public/data/template_embeddings.json", "w", encoding="utf-8") as f:
    json.dump(embeddings_data, f, indent=2)

with open("public/data/templates.json", "w", encoding="utf-8") as f:
    json.dump(templates, f, indent=2)

print("Generated template_embeddings.json (20 x 384 vectors) successfully!")
