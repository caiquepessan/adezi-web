-- 02_saas_schema.sql

-- Configuracões: uma por empresa
CREATE TABLE public.configuracoes (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresa(id) ON DELETE CASCADE DEFAULT auth.uid(),
  lucro_global_percent numeric DEFAULT 30,
  estoque_minimo_global integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage configuracoes" ON public.configuracoes FOR ALL USING (empresa_id = auth.uid());

-- Triggers to auto-create config and default user for a new empresa
CREATE OR REPLACE FUNCTION public.handle_new_empresa() 
RETURNS TRIGGER AS $$
BEGIN
  -- Cria config padrão
  INSERT INTO public.configuracoes (empresa_id) VALUES (NEW.id);
  
  -- Cria o usuário admin local padrão (Admin / 1234)
  INSERT INTO public.usuarios (empresa_id, username, senha, is_admin, permissoes)
  VALUES (NEW.id, 'admin', '1234', true, '{"todas": true}'::jsonb);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Categorias
CREATE TABLE public.categorias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(empresa_id, nome)
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage categorias" ON public.categorias FOR ALL USING (empresa_id = auth.uid());

-- Produtos
CREATE TABLE public.produtos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  nome text NOT NULL,
  categoria text NOT NULL,
  preco_custo numeric DEFAULT 0,
  preco_venda numeric DEFAULT 0,
  estoque_atual integer DEFAULT 0,
  codigo_barras text,
  usar_lucro_global boolean DEFAULT true,
  usar_estoque_global boolean DEFAULT true,
  percentual_lucro_manual numeric,
  estoque_minimo_manual integer,
  preco_combo numeric DEFAULT 0
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage produtos" ON public.produtos FOR ALL USING (empresa_id = auth.uid());

-- Usuarios
CREATE TABLE public.usuarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  username text NOT NULL,
  senha text NOT NULL,
  is_admin boolean DEFAULT false,
  permissoes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(empresa_id, username)
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage usuarios" ON public.usuarios FOR ALL USING (empresa_id = auth.uid());

-- Doses
CREATE TABLE public.doses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  produto_dose_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_garrafa_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  volume_garrafa integer CHECK (volume_garrafa > 0),
  volume_dose integer CHECK (volume_dose > 0),
  doses_restantes_abertas integer DEFAULT 0
);
ALTER TABLE public.doses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage doses" ON public.doses FOR ALL USING (empresa_id = auth.uid());

-- Produto Caixas
CREATE TABLE public.produto_caixas (
  produto_caixa_id uuid PRIMARY KEY REFERENCES public.produtos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  produto_unidade_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade_na_caixa integer CHECK (quantidade_na_caixa > 0)
);
ALTER TABLE public.produto_caixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage produto caixas" ON public.produto_caixas FOR ALL USING (empresa_id = auth.uid());

-- Combo Requisitos
CREATE TABLE public.combo_requisitos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  combo_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  categoria_nome text,
  quantidade integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.combo_requisitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage combo requisitos" ON public.combo_requisitos FOR ALL USING (empresa_id = auth.uid());

-- Combo Categorias Requisitos
CREATE TABLE public.combo_categorias_requisitos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  combo_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  categoria_nome text,
  quantidade integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.combo_categorias_requisitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage combo cat requisitos" ON public.combo_categorias_requisitos FOR ALL USING (empresa_id = auth.uid());

-- Combo Itens
CREATE TABLE public.combo_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  combo_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade integer CHECK (quantidade > 0)
);
ALTER TABLE public.combo_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage combo_itens" ON public.combo_itens FOR ALL USING (empresa_id = auth.uid());

-- Combo Itens Fixos
CREATE TABLE public.combo_itens_fixos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  combo_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.combo_itens_fixos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage combo_itens_fixos" ON public.combo_itens_fixos FOR ALL USING (empresa_id = auth.uid());

-- Vendas
CREATE TABLE public.vendas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  total numeric DEFAULT 0,
  lucro_total numeric DEFAULT 0,
  tipo_pagamento text
);
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage vendas" ON public.vendas FOR ALL USING (empresa_id = auth.uid());

-- Itens Venda
CREATE TABLE public.itens_venda (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  venda_id uuid REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade integer,
  preco_unitario numeric,
  lucro_unitario numeric,
  produto_nome_snapshot text,
  combo_selections jsonb
);
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage itens_venda" ON public.itens_venda FOR ALL USING (empresa_id = auth.uid());

-- Consumos
CREATE TABLE public.consumos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade integer CHECK (quantidade > 0),
  motivo text,
  responsavel_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.consumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage consumos" ON public.consumos FOR ALL USING (empresa_id = auth.uid());

-- Logs Atividade
CREATE TABLE public.logs_atividade (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.empresa(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  acao text,
  detalhes text
);
ALTER TABLE public.logs_atividade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage logs_atividade" ON public.logs_atividade FOR ALL USING (empresa_id = auth.uid());

-- Link Trigger
CREATE TRIGGER on_empresa_created
  AFTER INSERT ON public.empresa
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_empresa();
