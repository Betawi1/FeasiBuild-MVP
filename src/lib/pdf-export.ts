import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

export interface ExportOptions {
  slides: FeasibilitySlide[];
  getCurrentSlideIndex: () => number;
  setCurrentSlideIndex: (index: number) => Promise<void>;
  onProgress: (current: number, total: number) => void;
  projectInfo: FeasibilityProjectBundle;
}

function applyCaptureStyles(element: HTMLElement) {
  element.style.width = `${SLIDE_WIDTH}px`;
  element.style.height = `${SLIDE_HEIGHT}px`;
  element.style.overflow = "hidden";
  element.style.position = "relative";
  element.style.backgroundColor = "#ffffff";
  element.style.flexShrink = "0";
  element.scrollTop = 0;
  element.scrollLeft = 0;
}

export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { slides, setCurrentSlideIndex, onProgress, projectInfo } = options;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    compress: true,
    hotfixes: ["px_scaling"],
  });

  let capturedCount = 0;

  for (let i = 0; i < slides.length; i++) {
    try {
      onProgress(i + 1, slides.length);

      await setCurrentSlideIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const element = document.getElementById("slide-capture-container");
      if (!element) {
        throw new Error("Container not found");
      }

      const previous = {
        width: element.style.width,
        height: element.style.height,
        overflow: element.style.overflow,
        position: element.style.position,
        backgroundColor: element.style.backgroundColor,
        flexShrink: element.style.flexShrink,
      };

      applyCaptureStyles(element);

      const dataUrl = await domToPng(element, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        scale: 2,
        backgroundColor: "#ffffff",
        style: {
          width: `${SLIDE_WIDTH}px`,
          height: `${SLIDE_HEIGHT}px`,
          overflow: "hidden",
        },
        filter: (node) => {
          if ((node as HTMLElement).tagName === "SCRIPT") return false;
          return true;
        },
      });

      element.style.width = previous.width;
      element.style.height = previous.height;
      element.style.overflow = previous.overflow;
      element.style.position = previous.position;
      element.style.backgroundColor = previous.backgroundColor;
      element.style.flexShrink = previous.flexShrink;

      if (i > 0) {
        pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "landscape");
      }

      pdf.addImage(
        dataUrl,
        "PNG",
        0,
        0,
        SLIDE_WIDTH,
        SLIDE_HEIGHT,
        undefined,
        "FAST"
      );

      capturedCount++;
    } catch (error) {
      console.error(`Failed to capture slide ${i + 1}:`, error);

      if (i > 0) {
        pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "landscape");
      }
      pdf.setFontSize(20);
      pdf.setTextColor(255, 0, 0);
      pdf.text(`Error rendering Slide ${i + 1}`, 50, 360);
    }
  }

  if (capturedCount === 0) {
    throw new Error("No slides could be captured");
  }

  const city = projectInfo.location?.city || "Project";
  const date = new Date().toISOString().split("T")[0];
  pdf.save(`Feasibility_Study_${city}_${date}.pdf`);
}
