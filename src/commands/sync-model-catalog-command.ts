import { ModelCatalogService } from "@/ai/model-registry/model-catalog-service";
import { BaseCommand } from "@/commands/base-command";
import { getMessage } from "@/utils/i18n";
import { notify } from "@/utils/notification/notification-manager";
import * as vscode from "vscode";

export class SyncModelCatalogCommand extends BaseCommand {
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  async execute(): Promise<void> {
    try {
      const catalogService = ModelCatalogService.getInstance();
      const result = await catalogService.syncThirdPartyCatalog();

      if (result.success) {
        notify.info("model.catalog.sync.success", [
          String(result.totalEntries),
          String(result.updatedEntries),
        ]);
        return;
      }

      notify.warn("model.catalog.sync.partial", [
        String(result.totalEntries),
        String(result.updatedEntries),
        result.errors.join("; "),
      ]);
    } catch (error) {
      await this.handleError(error, getMessage("model.catalog.sync.failed"));
    }
  }
}

