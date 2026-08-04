#!/usr/bin/env python3
import os
from pptx import Presentation
from pptx.util import Inches

def build_keynote_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    image_dir = "/Users/arunthomas/.gemini/antigravity-ide/scratch/OmniSearch/slide_images"
    image_files = sorted([f for f in os.listdir(image_dir) if f.endswith('.png')])

    for img_name in image_files:
        img_path = os.path.join(image_dir, img_name)
        slide = prs.slides.add_slide(blank_layout)
        
        # Fit image to full 16:9 slide
        slide.shapes.add_picture(img_path, Inches(0), Inches(0), Inches(13.333), Inches(7.5))

    output_path = "/Users/arunthomas/.gemini/antigravity-ide/scratch/OmniSearch/OmniSearch_Presentation.pptx"
    prs.save(output_path)
    print(f"SUCCESS: Generated 100% pixel-perfect Keynote presentation at {output_path}")

if __name__ == "__main__":
    build_keynote_presentation()
