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
import { Select, SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { postMessage } from "@/utils/vscode";
import { zodResolver } from "@hookform/resolvers/zod";
import { UIRequest } from "@shared/types/messages";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_VARIABLES,
  PromptCategory,
  PromptVariable,
  CommitSubCategory,
  SUB_CATEGORY_DISPLAY_NAMES,
} from "@shared/types/prompts";
import React, { useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

const selectableCategories = [
  PromptCategory.Commit,
  PromptCategory.CodeReview,
  PromptCategory.PR,
  PromptCategory.Report,
  PromptCategory.Git,
];

const formSchema = z.object({
  key: z.string().min(1, { message: "提示词名称不能为空" }),
  content: z.string().min(1, { message: "提示词内容不能为空" }),
  category: z.nativeEnum(PromptCategory),
  subCategory: z.nativeEnum(CommitSubCategory).optional(),
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
      category: PromptCategory.Commit,
      subCategory: CommitSubCategory.Standard,
    },
  });

  // Use useWatch for React Compiler compatibility
  const selectedCategory = useWatch({
    name: "category",
    control: form.control,
  });
  const availableVariables: PromptVariable[] =
    CATEGORY_VARIABLES[selectedCategory] || [];

  // Handle category change - reset subCategory for non-Commit categories
  const handleCategoryChange = (value: string) => {
    const category = value as PromptCategory;
    form.setValue("category", category);
    if (category !== PromptCategory.Commit) {
      form.setValue("subCategory", undefined);
    } else {
      form.setValue("subCategory", CommitSubCategory.Standard);
    }
  };

  const onSubmit = useCallback(
    (values: FormValues) => {
      // Generate a unique key using timestamp and random suffix
      // This avoids conflicts from user-entered titles
      const timestamp = Date.now().toString(36);
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const uniqueKey = `prompt_${timestamp}_${randomSuffix}`;

      postMessage(UIRequest.PromptCreate, {
        key: uniqueKey,
        content: values.content,
        category: values.category,
        subCategory: values.subCategory,
        // Also pass the original title for display purposes
        title: values.key,
      });
      onClose();
      form.reset();
    },
    [form, onClose],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[525px] bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)] border-[var(--vscode-panel-border)]"
        onClose={onClose}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <DialogHeader>
              <DialogTitle>新建提示词</DialogTitle>
              <DialogDescription className="text-[var(--vscode-descriptionForeground)]">
                选择功能分类并创建新的提示词。每个分类有不同的可用变量。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>功能分类</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={handleCategoryChange}
                      >
                        {selectableCategories.map((cat) => (
                          <SelectOption key={cat} value={cat}>
                            {CATEGORY_DISPLAY_NAMES[cat]}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedCategory === PromptCategory.Commit && (
                <FormField
                  control={form.control}
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>提交模式</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || CommitSubCategory.Standard}
                          onValueChange={field.onChange}
                        >
                          <SelectOption value={CommitSubCategory.Standard}>
                            {
                              SUB_CATEGORY_DISPLAY_NAMES[
                                CommitSubCategory.Standard
                              ]
                            }
                          </SelectOption>
                          <SelectOption value={CommitSubCategory.Layered}>
                            {
                              SUB_CATEGORY_DISPLAY_NAMES[
                                CommitSubCategory.Layered
                              ]
                            }
                          </SelectOption>
                          <SelectOption value={CommitSubCategory.System}>
                            {
                              SUB_CATEGORY_DISPLAY_NAMES[
                                CommitSubCategory.System
                              ]
                            }
                          </SelectOption>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>提示词名称 (Key)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：my-commit-prompt"
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
                        placeholder="输入你的提示词内容，使用 {{变量名}} 插入变量"
                        className="h-40 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)] focus-visible:ring-offset-0 focus-visible:ring-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {availableVariables.length > 0 && (
                <div className="p-3 bg-[var(--vscode-editor-inactiveSelectionBackground)] rounded-md">
                  <div className="text-sm font-medium mb-2">可用变量：</div>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((v) => (
                      <span
                        key={v.name}
                        className="px-2 py-1 text-xs bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded cursor-pointer hover:opacity-80"
                        onClick={() => {
                          const current = form.getValues("content");
                          form.setValue("content", current + `{{${v.name}}}`);
                        }}
                        title={v.description}
                      >
                        {`{{${v.name}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
