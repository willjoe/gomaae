# rec-srt-generator

This project is the **Synthetic Reality Testing (SRT)** engine for the GalaSpo `rec` app. It utilizes **NVIDIA Omniverse Replicator** to generate deterministic, synchronized test data (Video, Audio, Gyro) from **OpenUSD** scenes.

## Project Structure

- `src/`: Python scripts for Omniverse Replicator.
- `scenes/`: OpenUSD (`.usd`, `.usdc`) assets authored in Blender/Omniverse.
- `output/`: Generated test triplets (Video, Audio, Metadata).

## Core Workflow

1.  **Scene Authoring:** SRA (Synthetic Reality Architect) creates the soccer field and player animations in Blender and exports to `scenes/soccer_field.usd`.
2.  **Generation:** Run the replicator script on the **AI Rack (RTX 5090)** to render the scenario.
3.  **Validation:** The CI/CD pipeline injects the resulting `.y4m` and `.json` files into the Playwright/Appium test suite.

## Usage (Headless)

```bash
# Run the soccer match generator
./omni-kit.sh --headless --exec src/generate_soccer_session.py \
  --scene scenes/soccer_field.usd \
  --frames 300 \
  --output output/session_001/
```
