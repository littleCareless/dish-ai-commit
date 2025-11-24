import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { postMessage } from "@/utils/vscode";
import { MessageType } from "@/types/messages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  key: z.string().min(1, { message: "提示词名称不能为空" }),
  content: z.string().min(1, { message: "提示词内容不能为空" }),
  saveTarget: z.enum(["workspace", "global"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePromptModal: React.FC<CreatePromptModalProps> = ({
  isOpen,
  onClose,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      content: "",
      saveTarget: "workspace",
    },
  });

  const onSubmit = (values: FormValues) => {
    postMessage(MessageType.CreatePrompt, {
      key: values.key,
      content: values.content,
      target: values.saveTarget,
    });
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)] border-[var(--vscode-panel-border)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <DialogHeader>
              <DialogTitle>新建提示词</DialogTitle>
              <DialogDescription className="text-[var(--vscode-descriptionForeground)]">
                在这里创建新的提示词，以便在以后快速使用。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>提示词名称 (Key)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：my-custom-prompt"
                        {...field}
                        className="bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)] focus-visible:ring-offset-0 focus-visible:ring-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>提示词内容</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="输入你的提示词内容"
                        className="h-40 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)] focus-visible:ring-offset-0 focus-visible:ring-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="saveTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>保存到:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem
                              value="workspace"
                              className="text-[var(--vscode-button-background)] border-[var(--vscode-input-border)]"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">工作区</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem
                              value="global"
                              className="text-[var(--vscode-button-background)] border-[var(--vscode-input-border)]"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">全局</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={onClose}
                className="bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] border-0"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
              >
                保存
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
