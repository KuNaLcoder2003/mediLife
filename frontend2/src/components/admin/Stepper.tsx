import Icon from "./Icon";

interface StepperProps {
    steps: string[];
    current: number;
}

export default function Stepper({ steps, current }: StepperProps) {
    return (
        <ol className="ap-stepper">
            {steps.map((label, i) => {
                const state = i < current ? "done" : i === current ? "current" : "upcoming";
                return (
                    <li key={label} className={`ap-step is-${state}`} aria-current={i === current ? "step" : undefined}>
                        <span className="ap-step-dot">{i < current ? <Icon name="check" size={14} /> : i + 1}</span>
                        {label}
                    </li>
                );
            })}
        </ol>
    );
}