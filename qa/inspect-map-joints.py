"""Plot the measured contours used by the bounded map-joint repair."""
import json, sys
from pathlib import Path
import shapely
from shapely import box
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

base = Path('.qa-results/crack-audit-682fa42-20260924')
shapes = {n: shapely.from_geojson(s) for n,s in json.loads((base/'geometry-complete/footprints.json').read_text()).items()}
windows = {'stadium':(227,17,251,35),'city-south':(-54,111,-47,118),'city-nw':(-101,23,-95,30),'bridge':(-125,50,-94,70),'fairground':(158,-182,205,-86),'fair-south':(198,-95,205,-87)}
colors={'3_CIMEN':'#7eac49','5_YOL':'#b0797f','6_BORDUR':'#305dac','7_KALDIRIM_TABANI':'#f29933','5_DOGU_SAHIL_MEYDAN_ZEMIN':'#9c44a8','7_DOGU_SAHIL_MEYDAN_APRON':'#ee5353'}
out=Path('.qa-results/map-joint-finish-1');out.mkdir(exist_ok=True)
for label,bounds in windows.items():
    fig,ax=plt.subplots(figsize=(12,9));scope=box(*bounds)
    for name,color in colors.items():
        s=shapes[name].intersection(scope)
        parts=[s] if s.geom_type=='Polygon' else list(getattr(s,'geoms',[]))
        first=True
        for p in parts:
            if p.geom_type!='Polygon':continue
            for ring in [p.exterior,*p.interiors]:
                x,z=ring.xy;ax.plot(x,z,'-o',color=color,lw=1,markersize=2,label=name if first else None);first=False
    ax.set_xlim(bounds[0],bounds[2]);ax.set_ylim(bounds[3],bounds[1]);ax.set_aspect('equal');ax.grid(alpha=.2);ax.legend(fontsize=8);ax.set_title(label)
    fig.savefig(out/(label+'-contours.png'),dpi=140);plt.close(fig)
    print(label)
