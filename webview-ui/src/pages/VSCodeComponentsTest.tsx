import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectOption } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";

export const VSCodeComponentsTest: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [textareaValue, setTextareaValue] = useState("");

  const handleInputChange = (event: CustomEvent) => {
    setInputValue((event.target as HTMLInputElement)?.value || "");
  };

  const handleSelectChange = (event: CustomEvent) => {
    setSelectValue((event.target as HTMLSelectElement)?.value || "");
  };

  const handleCheckboxChange = (event: CustomEvent) => {
    setCheckboxChecked((event.target as HTMLInputElement)?.checked || false);
  };

  const handleSwitchChange = (event: CustomEvent) => {
    setSwitchChecked((event.target as HTMLInputElement)?.checked || false);
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(event.target.value || "0"));
  };

  const handleTextareaChange = (event: CustomEvent) => {
    setTextareaValue((event.target as HTMLTextAreaElement)?.value || "");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">
        VSCode Webview UI Toolkit Components Test
      </h1>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Components</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Components</TabsTrigger>
          <TabsTrigger value="layout">Layout Components</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Input Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Text Input</Label>
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Enter some text..."
                />
                <p className="text-sm text-muted-foreground">
                  Value: {inputValue}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Dropdown</Label>
                <Select value={selectValue} onChange={handleSelectChange}>
                  <SelectOption value="option1">Option 1</SelectOption>
                  <SelectOption value="option2">Option 2</SelectOption>
                  <SelectOption value="option3">Option 3</SelectOption>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selected: {selectValue}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Textarea</Label>
                <Textarea
                  value={textareaValue}
                  onChange={handleTextareaChange}
                  placeholder="Enter multiple lines of text..."
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Value: {textareaValue}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Checkbox</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={checkboxChecked}
                    onChange={handleCheckboxChange}
                  />
                  <Label>Checkbox Label</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Checked: {checkboxChecked.toString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Switch</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={switchChecked}
                    onChange={handleSwitchChange}
                  />
                  <Label>Switch Label</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  On: {switchChecked.toString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Slider: {sliderValue}</Label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={sliderValue}
                  onChange={handleSliderChange}
                />
                <p className="text-sm text-muted-foreground">
                  Value: {sliderValue}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Primary Button</Button>
                <Button appearance="secondary">Secondary Button</Button>
                <Button appearance="icon">Icon Button</Button>
                <Button disabled>Disabled Button</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badge Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default Badge</Badge>
                <Badge variant="secondary">Secondary Badge</Badge>
                <Badge variant="destructive">Destructive Badge</Badge>
                <Badge variant="outline">Outline Badge</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Default Alert</AlertTitle>
                <AlertDescription>
                  This is a default alert message.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTitle>Destructive Alert</AlertTitle>
                <AlertDescription>
                  This is a destructive alert message.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layout Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                These components help organize content and provide structure to
                the UI.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the content of the first card.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card 2</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the content of the second card.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
