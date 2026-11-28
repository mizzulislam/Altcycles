import { PageHeader } from "@/components/patterns";
import { PageLoader } from "@/components/ui/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
import { useSystemConfigState } from "./components/use-system-config-state";
import { SystemConfigTabIdentity } from "./components/system-config-tab-identity";
import { SystemConfigTabTax } from "./components/system-config-tab-tax";
import { SystemConfigTabAccounting } from "./components/system-config-tab-accounting";
import { SystemConfigTabSequences } from "./components/system-config-tab-sequences";
import { SystemConfigTabTemplates } from "./components/system-config-tab-templates";
import { SystemConfigDialogs } from "./components/system-config-dialogs";

export function SystemConfigPage() {
  const { t } = useLanguage();
  const {
    loading,
    company,
    setCompany,
    sequences,
    setSequences,
    counters,
    templates,
    savingCompany,
    pendingPkpState,
    setPendingPkpState,
    confirmPurgeOpen,
    setConfirmPurgeOpen,
    purging,
    handleSaveCompany,
    handleSaveSequence,
    handlePurgeTestData,
    handleSaveTemplate,
    handleToggleTesting,
    handleConfirmPkp,
  } = useSystemConfigState();

  if (loading || !company) {
    return <PageLoader message={t("settings:company.loading")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("settings:admin_settings.title")}
        description={t("settings:admin_settings.subtitle")}
      />

      <Tabs defaultValue="identitas">
        <TabsList>
          <TabsTrigger value="identitas">{t("settings:company.tab_identity")}</TabsTrigger>
          <TabsTrigger value="pajak">{t("settings:company.tab_tax_pkp")}</TabsTrigger>
          <TabsTrigger value="akuntansi">{t("settings:master_readonly.tab_controls")}</TabsTrigger>
          <TabsTrigger value="penomoran">{t("settings:admin_settings.sequences_card_title")}</TabsTrigger>
          <TabsTrigger value="template">{t("settings:admin_settings.templates_card_title")}</TabsTrigger>
        </TabsList>

        {/* TAB 1: IDENTITAS & REKENING */}
        <TabsContent value="identitas">
          <SystemConfigTabIdentity
            company={company}
            setCompany={setCompany}
            onSave={handleSaveCompany}
            saving={savingCompany}
          />
        </TabsContent>

        {/* TAB 2: PENGATURAN PAJAK */}
        <TabsContent value="pajak">
          <SystemConfigTabTax
            company={company}
            setCompany={setCompany}
            onOpenPkpConfirm={(checked) => setPendingPkpState(checked)}
          />
        </TabsContent>

        {/* TAB 3: MODE TESTING & KONTROL AKUNTANSI */}
        <TabsContent value="akuntansi">
          <SystemConfigTabAccounting
            company={company}
            onToggleTesting={handleToggleTesting}
            onOpenPurgeConfirm={() => setConfirmPurgeOpen(true)}
            purging={purging}
          />
        </TabsContent>

        {/* TAB 4: PENOMORAN DOKUMEN */}
        <TabsContent value="penomoran" className="flex flex-col gap-6">
          <SystemConfigTabSequences
            sequences={sequences}
            setSequences={setSequences}
            counters={counters}
            onSaveSequence={handleSaveSequence}
          />
        </TabsContent>

        {/* TAB 5: TEMPLATE & PLACEHOLDER */}
        <TabsContent value="template">
          <SystemConfigTabTemplates
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
          />
        </TabsContent>
      </Tabs>

      <SystemConfigDialogs
        pendingPkpState={pendingPkpState}
        onClosePkpConfirm={() => setPendingPkpState(null)}
        onConfirmPkp={handleConfirmPkp}
        confirmPurgeOpen={confirmPurgeOpen}
        onOpenChangePurge={setConfirmPurgeOpen}
        purging={purging}
        onConfirmPurge={handlePurgeTestData}
      />
    </div>
  );
}
