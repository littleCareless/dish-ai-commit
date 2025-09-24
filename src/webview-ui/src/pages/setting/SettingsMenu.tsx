import React from "react";
import { Menu as ArcoMenu } from "@arco-design/web-react";
import { SettingItem } from "./types";

interface SettingsMenuProps {
  selectedMenuItemKey: string;
  setSelectedMenuItemKey: (key: string) => void;
  settingsSchema: SettingItem[];
}

const generateMenuItems = (settingsSchema: SettingItem[]) => {
  if (!settingsSchema) {
    return [];
  }

  const menuStructure: {
    [key: string]: {
      label: string;
      children: { key: string; label: string }[];
    };
  } = {};

  settingsSchema.forEach((item) => {
    const parts = item.key?.split(".");
    if (parts.length >= 2) {
      const topKey = parts[0];
      const childKey = parts.slice(0, 2).join(".");

      if (!menuStructure[topKey]) {
        const topLevelSchema = settingsSchema.find((s) => s.key === topKey);
        menuStructure[topKey] = {
          label:
            topLevelSchema?.description ||
            topKey.charAt(0).toUpperCase() + topKey.slice(1),
          children: [],
        };
      }

      if (!menuStructure[topKey].children.some((c) => c.key === childKey)) {
        const childSchema = settingsSchema.find((s) => s.key === childKey);
        menuStructure[topKey].children.push({
          key: childKey,
          label:
            childSchema?.description ||
            childKey?.split(".").pop() ||
            "Unknown Setting",
        });
      }
    } else if (parts.length === 1) {
      const topKey = parts[0];
      if (!menuStructure[topKey]) {
        menuStructure[topKey] = {
          label: item.description || topKey,
          children: [],
        };
      }
    }
  });

  return Object.entries(menuStructure).map(([key, value]) => ({
    key,
    label: value.label,
    children: value.children.length > 0 ? value.children : undefined,
  }));
};

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  selectedMenuItemKey,
  setSelectedMenuItemKey,
  settingsSchema,
}) => {
  const menuItems = React.useMemo(
    () => generateMenuItems(settingsSchema),
    [settingsSchema]
  );

  return (
    <ArcoMenu
      selectedKeys={[selectedMenuItemKey]}
      onClickMenuItem={(key: string) => setSelectedMenuItemKey(key)}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "var(--color-background)",
        color: "var(--color-foreground)",
        borderColor: "var(--color-border)",
      }}
      collapse={false}
    >
      {menuItems.map((item) =>
        item.children ? (
          <ArcoMenu.SubMenu
            key={item.key}
            title={<span>{item.label}</span>}
          >
            {item.children.map((child) => (
              <ArcoMenu.Item key={child.key}>{child.label}</ArcoMenu.Item>
            ))}
          </ArcoMenu.SubMenu>
        ) : (
          <ArcoMenu.Item key={item.key}>{item.label}</ArcoMenu.Item>
        )
      )}
    </ArcoMenu>
  );
};

export default SettingsMenu;
