# rec-srt-generator

This project is the **Synthetic Reality Testing (SRT)** engine for the GalaSpo `rec` app. It utilizes **NVIDIA Omniverse Replicator** to generate deterministic, synchronized test data (Video, Audio, Gyro) from **OpenUSD** scenes.

## Project Structure

- `src/`: Python scripts for Omniverse Replicator.
- `scenes/`: OpenUSD (`.usd`, `.usdc`) assets authored in Blender/Omniverse.
- `output/`: Generated test triplets (Video, Audio, Metadata).

## Core Workflow (AI Orchestrated Pairing & Personality Vectors)

In the High-Integrity architecture, the SRA acts as the "Architect of Context" while the AI Agent acts as the Omniverse script executor.

1.  **Scene Authoring:** SRA (Synthetic Reality Architect) focuses purely on creative scene direction, creating the soccer field and player animations in Blender and exporting to `scenes/soccer_field.usd`.
2.  **Personality Injection:** The SRA defines their specific cinematography style (camera shake, speed, angles) in a JSON personality vector (`sra-cinematography-style.json`).
3.  **Orchestrated Pairing Generation:** 
    *   The SRA works alongside their AI Assistant in the isolated sandbox.
    *   The AI reads the personality vector and automatically generates the exact procedural Python logic in `generate_soccer_session.py`.
    *   The script is executed headlessly on the **AI Rack (RTX 5090)** to render the scenario.
4.  **Validation:** The CI/CD pipeline injects the resulting `.y4m` and `.json` files into the Playwright/Appium test suite.

## Usage (Headless)

```bash
# Run the soccer match generator
./omni-kit.sh --headless --exec src/generate_soccer_session.py \
  --scene scenes/soccer_field.usd \
  --frames 300 \
  --output output/session_001/
```
