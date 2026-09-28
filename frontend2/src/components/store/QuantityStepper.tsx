import Icon from "./Icon";

interface QuantityStepperProps {
  value: number;
  max: number;
  min?: number;
  label: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function QuantityStepper({ value, max, min = 1, label, onChange, disabled }: QuantityStepperProps) {
  return (
    <div className="ml-stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Icon name="minus" size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
