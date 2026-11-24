import { useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import "./subscription-feature-disclosure.css";

export function useFeatureDisclosure<T>(allRows: T[], _locale: string) {
    const [expanded, setExpanded] = useState(false);
    const id = useId();
    const ref = useRef<HTMLDivElement>(null);
    const text = ["展开全部", "收起"];
    const Icon = expanded ? ChevronUp : ChevronDown;
    return {
        rows: expanded ? allRows : allRows.slice(0, 6),
        id,
        ref,
        toggle:
            allRows.length > 6 ? (
                <div className={`subscription-feature-disclosure${expanded ? "" : " is-collapsed"}`}>
                    <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={id}
                        onClick={() => {
                            if (expanded && ref.current && ref.current.getBoundingClientRect().top < 0) {
                                ref.current.scrollIntoView({ block: "start", behavior: "instant" });
                            }
                            setExpanded((value) => !value);
                        }}
                    >
                        {text[expanded ? 1 : 0]} <Icon size={16} aria-hidden="true" />
                    </button>
                </div>
            ) : null,
    };
}
