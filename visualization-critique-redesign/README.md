# Visualization Critique and Redesign

This folder contains the STATS 401 individual project. It critiques and redesigns
Our World in Data's visualization, "Income inequality in market and disposable
income across the world."

## Files

- `index.html`: project page and approximately 740-word report
- `redesign.js`: interactive D3.js dumbbell plot
- `style.css`: project-specific responsive styling
- `data/`: downloaded CSV data and metadata
- `assets/original_visualization.png`: original visualization screenshot
- `output/`: one-slide presentation and PDF handout

## Local preview

Because the visualization loads a CSV file, serve the repository through a local
web server instead of opening `index.html` directly.

```powershell
python -m http.server 8000
```

Then open:

`http://localhost:8000/visualization-critique-redesign/`

## Sources

- Our World in Data: https://ourworldindata.org/grapher/income-inequality-in-market-and-disposable-income-across-the-world
- Wang, C., Caminada, K., and Solt, F. (2016).
- The CORE Team, *The Economy*, Unit 5, Section 5.12, Figure 5.16.
