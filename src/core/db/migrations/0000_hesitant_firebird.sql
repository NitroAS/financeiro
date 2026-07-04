CREATE TABLE `responsavel` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`cor` text NOT NULL,
	`icone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conta` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`instituicao` text,
	`saldo_inicial` real DEFAULT 0 NOT NULL,
	`cor` text NOT NULL,
	`icone` text NOT NULL,
	`responsavel_id` text,
	`arquivada` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`responsavel_id`) REFERENCES `responsavel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cartao` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`banco` text NOT NULL,
	`bandeira` text NOT NULL,
	`limite` real NOT NULL,
	`dia_fechamento` integer NOT NULL,
	`dia_vencimento` integer NOT NULL,
	`conta_pagamento_id` text,
	`responsavel_id` text,
	`cor` text NOT NULL,
	`icone` text NOT NULL,
	FOREIGN KEY (`conta_pagamento_id`) REFERENCES `conta`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsavel_id`) REFERENCES `responsavel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categoria` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`cor` text NOT NULL,
	`icone` text NOT NULL,
	`categoria_pai_id` text,
	FOREIGN KEY (`categoria_pai_id`) REFERENCES `categoria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `etiqueta` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`cor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recorrencia` (
	`id` text PRIMARY KEY NOT NULL,
	`frequencia` text NOT NULL,
	`dia_referencia` integer NOT NULL,
	`ativa` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lancamento` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`descricao` text NOT NULL,
	`valor` real NOT NULL,
	`data` text NOT NULL,
	`vencimento` text,
	`data_pagamento` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`conta_id` text,
	`cartao_id` text,
	`categoria_id` text,
	`responsavel_id` text,
	`forma_pagamento` text,
	`observacao` text,
	`favorito` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`grupo_parcelamento_id` text,
	`parcela_atual` integer,
	`parcela_total` integer,
	`recorrencia_id` text,
	`origem_importacao` text,
	`criado_em` text,
	`atualizado_em` text,
	FOREIGN KEY (`conta_id`) REFERENCES `conta`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cartao_id`) REFERENCES `cartao`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsavel_id`) REFERENCES `responsavel`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorrencia_id`) REFERENCES `recorrencia`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lancamento_etiqueta` (
	`lancamento_id` text NOT NULL,
	`etiqueta_id` text NOT NULL,
	PRIMARY KEY(`lancamento_id`, `etiqueta_id`),
	FOREIGN KEY (`lancamento_id`) REFERENCES `lancamento`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`etiqueta_id`) REFERENCES `etiqueta`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `anexo` (
	`id` text PRIMARY KEY NOT NULL,
	`lancamento_id` text NOT NULL,
	`nome_arquivo` text NOT NULL,
	`mime` text NOT NULL,
	`conteudo` blob NOT NULL,
	FOREIGN KEY (`lancamento_id`) REFERENCES `lancamento`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `historico_alteracao` (
	`id` text PRIMARY KEY NOT NULL,
	`lancamento_id` text NOT NULL,
	`campo` text NOT NULL,
	`valor_antigo` text,
	`valor_novo` text,
	`alterado_em` text NOT NULL,
	FOREIGN KEY (`lancamento_id`) REFERENCES `lancamento`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orcamento` (
	`id` text PRIMARY KEY NOT NULL,
	`categoria_id` text NOT NULL,
	`mes` integer NOT NULL,
	`ano` integer NOT NULL,
	`valor_planejado` real NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`valor_alvo` real NOT NULL,
	`valor_atual` real DEFAULT 0 NOT NULL,
	`data_alvo` text,
	`cor` text NOT NULL,
	`icone` text NOT NULL,
	`conta_vinculada_id` text,
	FOREIGN KEY (`conta_vinculada_id`) REFERENCES `conta`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meta_movimento` (
	`id` text PRIMARY KEY NOT NULL,
	`meta_id` text NOT NULL,
	`tipo` text NOT NULL,
	`valor` real NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`meta_id`) REFERENCES `meta`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `investimento` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`instituicao` text,
	`responsavel_id` text,
	FOREIGN KEY (`responsavel_id`) REFERENCES `responsavel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `investimento_movimento` (
	`id` text PRIMARY KEY NOT NULL,
	`investimento_id` text NOT NULL,
	`tipo` text NOT NULL,
	`valor` real NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`investimento_id`) REFERENCES `investimento`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `filtro_salvo` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`escopo` text NOT NULL,
	`parametros_json` text NOT NULL
);
