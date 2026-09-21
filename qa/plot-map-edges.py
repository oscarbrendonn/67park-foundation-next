"""Geometry diagrams (not edited game screenshots) for reviewing contour repairs."""
import json, sys
from pathlib import Path
import shapely
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch

rows=json.loads(Path(sys.argv[1]).read_text())
shapes={n:shapely.from_geojson(s) for n,s in rows.items()}
def polys(g):
    if g.is_empty: return []
    if g.geom_type=='Polygon': return [g]
    return [p for c in getattr(g,'geoms',[]) for p in polys(c)]
fig, axes=plt.subplots(2,2,figsize=(12,10))
for ax,(label,bounds) in zip(axes.flat,[('central slabs',(-6,-80,106,15)),('south west join',(-22,133,20,163)),('west housing',(-176,40,-125,114)),('southern coast',(-15,120,250,173))]):
    for name,s in shapes.items():
        if not name.startswith(('3_CIMEN','5_YOL','6_BORDUR','7_KALDIRIM','CENTER_WHITE')): continue
        color='#bcc992' if name.startswith('3_') else '#dab0ab' if name.startswith('5_') else '#d6c8cb' if name.startswith('CENTER') else '#b39182'
        for p in polys(s.intersection(shapely.box(*bounds))):
            ax.add_patch(Patch(list(p.exterior.coords),facecolor=color,edgecolor='#544d48',linewidth=.25))
            for h in p.interiors: ax.add_patch(Patch(list(h.coords),facecolor='white',edgecolor='#544d48',linewidth=.25))
    ax.set(xlim=(bounds[0],bounds[2]),ylim=(bounds[3],bounds[1]),title=label,aspect='equal');ax.grid(alpha=.2)
fig.tight_layout();fig.savefig(sys.argv[2],dpi=160)
