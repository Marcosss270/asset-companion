
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'ativos','empresas','fornecedores','fornecedor_produtos','categorias','estoque_consumiveis',
  'impressoras','impressora_leituras','contratos','contrato_documentos','licencas_software',
  'licenca_atribuicoes','ativo_garantias','manutencoes','movimentacoes','alertas','sugestoes_compra',
  'agentes','agente_inventarios','agente_eventos','dispositivos_descobertos','audit_log','configuracoes',
  'departamentos','centros_custo'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organizacao_id SET DEFAULT public.current_org_id()', t);
  END LOOP;
END $$;
