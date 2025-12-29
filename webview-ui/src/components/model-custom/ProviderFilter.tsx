import { Select, SelectOption } from "@/components/ui/select";

interface ProviderFilterProps {
  value: string;
  onChange: (value: string) => void;
  providers: { id: string; name: string }[];
}

export function ProviderFilter({
  value,
  onChange,
  providers,
}: ProviderFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">提供商筛选:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectOption value="all">全部</SelectOption>
        {providers.map((p) => (
          <SelectOption key={p.id} value={p.id}>
            {p.name}
          </SelectOption>
        ))}
      </Select>
    </div>
  );
}
