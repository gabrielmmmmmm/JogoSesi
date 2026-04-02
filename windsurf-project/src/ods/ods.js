export const ODS = [
  {
    id: 12,
    title: 'Consumo e Produção Responsáveis',
    short: 'ODS 12',
    description:
      'Promover padrões de consumo e produção sustentáveis: reduzir desperdícios, reciclar, reutilizar e usar recursos naturais com responsabilidade.',
  },
  {
    id: 9,
    title: 'Indústria, Inovação e Infraestrutura',
    short: 'ODS 9',
    description:
      'Construir infraestruturas resilientes e sustentáveis, promover a industrialização inclusiva e apoiar a inovação e novas tecnologias.',
  },
  {
    id: 7,
    title: 'Energia Acessível e Limpa',
    short: 'ODS 7',
    description:
      'Garantir acesso à energia confiável e moderna para todos, com mais eficiência energética e maior participação de fontes renováveis.',
  },
  {
    id: 6,
    title: 'Água Potável e Saneamento',
    short: 'ODS 6',
    description:
      'Assegurar água potável e saneamento para todos: proteger mananciais, tratar esgoto e melhorar a gestão e o uso eficiente da água.',
  },
  {
    id: 13,
    title: 'Ação Contra a Mudança do Clima',
    short: 'ODS 13',
    description:
      'Tomar medidas urgentes contra a mudança do clima: reduzir emissões, aumentar a resiliência e se adaptar a eventos extremos.',
  },
  {
    id: 11,
    title: 'Cidades e Comunidades Sustentáveis',
    short: 'ODS 11',
    description:
      'Tornar cidades inclusivas e seguras: mobilidade, habitação, planejamento urbano, redução de riscos e gestão de resíduos.',
  },
  {
    id: 15,
    title: 'Vida Terrestre',
    short: 'ODS 15',
    description:
      'Proteger ecossistemas terrestres: combater desmatamento, conservar biodiversidade, recuperar áreas degradadas e usar o solo de forma sustentável.',
  },
  {
    id: 14,
    title: 'Vida na Água',
    short: 'ODS 14',
    description:
      'Conservar oceanos e recursos marinhos: reduzir poluição, proteger habitats, combater pesca predatória e preservar a biodiversidade aquática.',
  },
  {
    id: 3,
    title: 'Saúde e Bem-Estar',
    short: 'ODS 3',
    description:
      'Garantir vida saudável para todos: prevenção de doenças, saúde mental, segurança no trânsito e acesso a serviços de saúde de qualidade.',
  },
  {
    id: 17,
    title: 'Parcerias e Meios de Implementação',
    short: 'ODS 17',
    description:
      'Fortalecer parcerias para alcançar os ODS: cooperação, financiamento, tecnologia, capacitação e dados para apoiar ações sustentáveis.',
  },
];

export function odsInfo(phaseIndex) {
  return ODS[phaseIndex] ?? null;
}

export function odsLabel(phaseIndex) {
  const o = ODS[phaseIndex];
  if (!o) return '';
  return `${o.short}: ${o.title}`;
}
