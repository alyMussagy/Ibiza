export const categories = [
  {
    slug: "destinos",
    label: "Destinos",
    short: "Um lugar para descobrir",
    description: "Da costa às ilhas, começa a desenhar a tua próxima viagem.",
    icon: "compass",
  },
  {
    slug: "estadias",
    label: "Alojamentos",
    short: "Acordar noutro ritmo",
    description: "Inspiração para uma estadia perto do mar e longe da rotina.",
    icon: "bed",
  },
  {
    slug: "eventos",
    label: "Eventos",
    short: "Encontra a tua energia",
    description: "Música, encontros e momentos para partilhar.",
    icon: "music",
  },
  {
    slug: "restaurantes",
    label: "Restaurantes",
    short: "Sabores que ficam",
    description: "Descobre a gastronomia e os espaços à mesa.",
    icon: "food",
  },
  {
    slug: "experiencias",
    label: "Experiências",
    short: "Vive algo pela primeira vez",
    description: "Do oceano à terra, inspira-te para explorar mais.",
    icon: "waves",
  },
] as const;
export type Category = (typeof categories)[number]["slug"];
export type DemoListing = {
  slug: string;
  title: string;
  location: string;
  category: Category;
  image: string;
  tag: string;
  description: string;
};
// Editorial fixtures only. Never used as inventory, prices or transactional records.
export const demoListings: DemoListing[] = [
  {
    slug: "tofo",
    title: "Tofo, ao ritmo do oceano",
    location: "Tofo · Inhambane",
    category: "destinos",
    image: "/images/coast.jpg",
    tag: "Praia & natureza",
    description:
      "Uma ideia de viagem para quem procura dias de praia e tempo para abrandar. Conteúdo editorial de demonstração; fotografia ilustrativa.",
  },
  {
    slug: "vilanculos",
    title: "Vilanculos, horizonte azul",
    location: "Vilanculos · Inhambane",
    category: "destinos",
    image: "/images/island.jpg",
    tag: "Ilhas & descoberta",
    description:
      "Inspiração para descobrir a costa de Inhambane. Este exemplo não representa um pacote turístico disponível; fotografia ilustrativa.",
  },
  {
    slug: "barra",
    title: "Barra, sem pressa",
    location: "Barra · Inhambane",
    category: "destinos",
    image: "/images/beach.jpg",
    tag: "Sol & tranquilidade",
    description:
      "Um ponto de partida para imaginar a próxima escapadinha. Conteúdo de demonstração, sem serviços reserváveis; fotografia ilustrativa.",
  },
  {
    slug: "casa-do-mar-demo",
    title: "Uma casa perto do mar",
    location: "Tofo · Inhambane",
    category: "estadias",
    image: "/images/stay.jpg",
    tag: "Estadia demonstrativa",
    description:
      "Exemplo fictício de alojamento para validar a apresentação do catálogo. Não existe disponibilidade, preço ou reserva real associada.",
  },
  {
    slug: "encontro-ao-sol-demo",
    title: "Encontros ao pôr do sol",
    location: "Barra · Inhambane",
    category: "eventos",
    image: "/images/beach.jpg",
    tag: "Evento demonstrativo",
    description:
      "Exemplo fictício de evento. Não há data confirmada nem bilhetes à venda.",
  },
  {
    slug: "sabores-da-costa-demo",
    title: "Sabores da costa",
    location: "Inhambane · Cidade",
    category: "restaurantes",
    image: "/images/food.jpg",
    tag: "Restaurante demonstrativo",
    description:
      "Exemplo fictício de restaurante, utilizado para apresentar a experiência visual. Não recebe pedidos de mesa.",
  },
  {
    slug: "passeio-no-mar-demo",
    title: "Um dia de mar",
    location: "Vilanculos · Inhambane",
    category: "experiencias",
    image: "/images/island.jpg",
    tag: "Experiência demonstrativa",
    description:
      "Exemplo fictício de actividade. Não representa um operador, sessão ou serviço disponível para compra.",
  },
];
export function filterListings(query = "", category = "") {
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt");
  const q = normalize(query.trim());
  return demoListings.filter(
    (item) =>
      (!category || item.category === category) &&
      normalize(`${item.title} ${item.location} ${item.tag}`).includes(q),
  );
}
