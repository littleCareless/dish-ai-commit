import React from "react";
import { Menu as ArcoMenu } from "@arco-design/web-react";
import { menuItemsConfig } from "./menuConfig";

interface SettingsMenuProps {
  selectedMenuItemKey: string;
  setSelectedMenuItemKey: (key: string) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  selectedMenuItemKey,
  setSelectedMenuItemKey,
}) => {
  return (
    <ArcoMenu
      selectedKeys={[selectedMenuItemKey]}
      onClickMenuItem={(key) => setSelectedMenuItemKey(key)}
      style={{ width: "100%", height: "100%" }}
      collapse={false}
    >
      {menuItemsConfig.map((item) =>
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
