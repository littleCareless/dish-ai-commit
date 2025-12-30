import { Select, SelectOption } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("model-custom");

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{t("filter.label")}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectOption value="all">{t("filter.all")}</SelectOption>
        {providers.map((p) => (
          <SelectOption key={p.id} value={p.id}>
            {p.name}
          </SelectOption>
        ))}
      </Select>
    </div>
  );
}
