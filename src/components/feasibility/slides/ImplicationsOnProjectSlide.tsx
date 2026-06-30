"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { ImplicationsData } from "@/types/feasibility";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";

interface Props extends SlideEditingProps {
  data: ImplicationsData;
  city: string;
  subtitle?: string;
}

export default function ImplicationsOnProjectSlide({
  data,
  subtitle = "Market Analysis",
  isEditing = false,
  onDataChange,
}: Props) {
  const updateImplication = (
    index: number,
    patch: Partial<ImplicationsData["hospitalityImplications"][number]>
  ) => {
    onDataChange?.({
      ...data,
      hospitalityImplications: data.hospitalityImplications.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateTakeaway = (index: number, text: string) => {
    onDataChange?.({
      ...data,
      keyTakeaways: data.keyTakeaways.map((t, i) => (i === index ? text : t)),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Implications of the market findings on the Project"
        subtitle={subtitle}
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
        <div className="col-span-2 bg-slate-100 p-3 rounded-lg min-h-0 overflow-hidden">
          <h3 className="text-xs font-bold mb-2 text-center bg-slate-800 text-white p-1.5 rounded">
            {subtitle}
          </h3>
          <ol className="space-y-1.5 text-sm text-slate-700">
            {data.hospitalityImplications.map((item, i) => (
              <li key={i} className="flex items-start">
                <span className="font-bold text-slate-800 mr-2 shrink-0">
                  {item.number}.
                </span>
                <span className="leading-snug flex-1">
                  {isEditing ? (
                    <span className="space-y-1 block">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateImplication(i, { title: e.target.value })
                        }
                        className="w-full font-bold text-slate-800 p-1.5 bg-white border border-emerald-500/50 rounded text-sm"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          updateImplication(i, { description: e.target.value })
                        }
                        className="w-full p-1.5 bg-white border border-emerald-500/50 rounded text-sm resize-y min-h-[48px]"
                      />
                    </span>
                  ) : (
                    <>
                      <strong className="text-slate-800">{item.title}:</strong>{" "}
                      {item.description}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col justify-center min-h-0">
          <div className="bg-emerald-50 border-2 border-emerald-500 p-3 rounded-lg">
            <ul className="space-y-2 text-sm text-emerald-800">
              {data.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-emerald-500 mr-2 font-bold shrink-0">
                    ✓
                  </span>
                  <EditableTextBlock
                    text={takeaway}
                    isEditing={isEditing}
                    onChange={(text) => updateTakeaway(i, text)}
                    className="leading-snug flex-1"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
