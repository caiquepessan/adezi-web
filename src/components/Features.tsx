
import { motion } from 'framer-motion';
import { Layers, Zap, Shield, Search, Package, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "PDV Ultra Rápido",
    description: "Venda produtos, combos e doses em segundos com uma interface otimizada para o dia a dia da sua adega."
  },
  {
    icon: <Package className="w-6 h-6 text-primary" />,
    title: "Estoque Dinâmico",
    description: "Cálculo inteligente para caixas e fardos. O estoque da caixa atualiza automaticamente baseado na unidade."
  },
  {
    icon: <Search className="w-6 h-6 text-primary" />,
    title: "Busca Inteligente",
    description: "Encontre produtos, categorias e ordens rapidamente, com pesquisa difusa (fuzzy search) de alta velocidade."
  },
  {
    icon: <Layers className="w-6 h-6 text-primary" />,
    title: "Gerenciamento de Combos",
    description: "Crie combos com precificação flexível. O sistema calcula o preço na hora baseado na bebida escolhida."
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: "Dashboard e Relatórios",
    description: "Acompanhe suas vendas, lucros e estoque através de gráficos dinâmicos e exporte tudo com um clique."
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: "Offline e Seguro",
    description: "O aplicativo desktop possui suporte para funcionamento e armazenamento local. Sincronização segura."
  }
];

const Features = () => {
  return (
    <div id="features" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-3">Recursos Completos</h2>
          <h3 className="text-3xl md:text-5xl font-bold mb-6">Tudo estruturado no seu lugar.</h3>
          <p className="text-lg text-muted-foreground">
            Desenhado exclusivamente para o fluxo acelerado de vendas de bebidas, do atacado ao varejo de balcão.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-[#121214] border border-white/5 p-8 rounded-2xl hover:border-white/10 hover:bg-[#18181b] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
