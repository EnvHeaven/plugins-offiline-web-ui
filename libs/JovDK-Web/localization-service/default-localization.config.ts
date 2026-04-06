import { LocalizationConfig } from './localization-config';

const RAW_LANGUAGE_OPTIONS = [

    {
        Id: 'pt-br',
        Name: 'Português',
        FlagIconName: 'brazil-flag-icon-01',
    },
    {
        Id: 'en-us',
        Name: 'English (US)',
        FlagIconName: 'usa-flag-icon-01',
    },

] as const;

const RAW_TERMS = [

    {
        TermKey: 'soon...',
        TermValueByLanguage: {
            'pt-br': 'Em breve...',
            'en-us': 'Soon...',
        },
    },
    {
        TermKey: 'Follow it on Twitter!',
        TermValueByLanguage: {
            'pt-br': 'Acompanhe no Twitter!',
            'en-us': 'Follow it on Twitter!',
        },
    },

    // home start
    {
        TermKey: 'home-see-on-pump-fun',
        TermValueByLanguage: {
            'pt-br': 'Ver no pump.fun',
            'en-us': 'See on pump.fun',
        },
    },
    {
        TermKey: 'home-add-to-phantom',
        TermValueByLanguage: {
            'pt-br': 'Adicionar à Phantom',
            'en-us': 'Add to Phantom',
        },
    },
    {
        TermKey: 'home-add-to-metamask',
        TermValueByLanguage: {
            'pt-br': 'Adicionar à MetaMask',
            'en-us': 'Add to MetaMask',
        },
    },
    {
        TermKey: 'home-caution-with-scams-fake-profiles-contracts-links',
        TermValueByLanguage: {
            'pt-br':
                'Cuidado com scams; perfis, contratos e sites falsos. Sempre busque links oficiais!',
            'en-us':
                'Be careful with scams, fake profiles, contracts, and links. Always look for official links!',
        },
    },

    // home roadmap
    {
        TermKey: 'home-roadmap-title',
        TermValueByLanguage: {
            'pt-br': 'Roadmap',
            'en-us': 'Roadmap',
        },
    },
    {
        TermKey: 'home-where-and-when-will-BASE-ANGULAR-PROJECT-01-pass',
        TermValueByLanguage: {
            'pt-br': 'Por onde a $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 vai passar e quando',
            'en-us': 'Where and when will $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 be available',
        },
    },
    {
        TermKey: 'home-december-2024',
        TermValueByLanguage: {
            'pt-br': 'Dezembro de 2024',
            'en-us': 'December 2024',
        },
    },
    {
        TermKey: 'home-website-launch',
        TermValueByLanguage: {
            'pt-br': '- Lançamento do website',
            'en-us': '- Website launch',
        },
    },
    {
        TermKey: 'home-twitter-launch',
        TermValueByLanguage: {
            'pt-br': '- Lançamento do Twitter',
            'en-us': '- Twitter launch',
        },
    },
    {
        TermKey: 'home-token-launch',
        TermValueByLanguage: {
            'pt-br': '- Lançamento do token',
            'en-us': '- Token launch',
        },
    },
    {
        TermKey: 'home-first-quarter-2025',
        TermValueByLanguage: {
            'pt-br': '1º trimestre de 2025',
            'en-us': '1st quarter of 2025',
        },
    },
    {
        TermKey: 'home-telegram-group',
        TermValueByLanguage: {
            'pt-br': '- Grupo no Telegram',
            'en-us': '- Telegram group',
        },
    },
    {
        TermKey: 'home-discord-server',
        TermValueByLanguage: {
            'pt-br': '- Servidor no Discord',
            'en-us': '- Discord server',
        },
    },
    {
        TermKey: 'home-second-quarter-2025',
        TermValueByLanguage: {
            'pt-br': '2º trimestre de 2025',
            'en-us': '2nd quarter of 2025',
        },
    },
    {
        TermKey: 'home-blackjack-game',
        TermValueByLanguage: {
            'pt-br': '- Blackjack (jogo)',
            'en-us': '- Blackjack (game)',
        },
    },
    {
        TermKey: 'home-blackjack-21-against-players-or-table',
        TermValueByLanguage: {
            'pt-br':
                'Blackjack (21) contra outros jogadores ou contra a mesa. Os jogadores poderão jogar sem ter que deixar a $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 depositada em qualquer outro lugar que não seja a própria wallet.',
            'en-us':
                'Blackjack (21) against other players or the table. Players will be able to play without having to leave their $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 deposited anywhere other than their own wallet.',
        },
    },
    {
        TermKey: 'home-third-quarter-2025',
        TermValueByLanguage: {
            'pt-br': '3º trimestre de 2025',
            'en-us': '3rd quarter of 2025',
        },
    },
    {
        TermKey: 'home-roadmap-review',
        TermValueByLanguage: {
            'pt-br': '- Revisão do roadmap',
            'en-us': '- Roadmap review',
        },
    },
    {
        TermKey: 'home-roadmap-review-validation',
        TermValueByLanguage: {
            'pt-br':
                'Revisão para validar o conteúdo do roadmap e avaliar se algo pode/precisa ser adiantado ou adiado, com base no progresso atual e no estado do projeto.',
            'en-us':
                'Review to validate the roadmap content and assess whether anything should be brought forward or postponed based on current progress and project status.',
        },
    },
    {
        TermKey: 'home-poker-game',
        TermValueByLanguage: {
            'pt-br': '- Poker (jogo)',
            'en-us': '- Poker (game)',
        },
    },
    {
        TermKey: 'home-poker-texas-holdem-against-players',
        TermValueByLanguage: {
            'pt-br':
                "Poker (Texas Hold'em) contra outros jogadores. Os jogadores poderão jogar sem ter que deixar a $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 depositada em qualquer outro lugar que não seja a própria wallet.",
            'en-us':
                "Poker (Texas Hold’em) against other players. Players will be able to play without having to leave their $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 deposited anywhere other than their own wallet.",
        },
    },
    {
        TermKey: 'home-fourth-quarter-2025',
        TermValueByLanguage: {
            'pt-br': '4º trimestre de 2025',
            'en-us': '4th quarter of 2025',
        },
    },
    {
        TermKey: 'home-project-p',
        TermValueByLanguage: {
            'pt-br': '- "Projeto P"',
            'en-us': '- "Project P"',
        },
    },
    {
        TermKey: 'home-game-with-own-token-nfts-staking',
        TermValueByLanguage: {
            'pt-br':
                'Jogo com token próprio, 2 coleções de NFTs e staking (e talvez PVP), baseado em um jogo antigo muito conhecido. A primeira rodada de venda do token será feita apenas em $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01.',
            'en-us':
                'Game with its own token, 2 NFT collections, and staking (and maybe PVP), based on a very well-known classic game. The first round of the token sale will be made only in $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01.',
        },
    },
    {
        TermKey: 'home-roadmap-content-review',
        TermValueByLanguage: {
            'pt-br': 'Revisão do conteúdo do roadmap',
            'en-us': 'Roadmap content review',
        },
    },

    // home about
    {
        TermKey: 'home-about-title',
        TermValueByLanguage: {
            'pt-br': 'Sobre',
            'en-us': 'About',
        },
    },
    {
        TermKey: 'home-pichanha-coin-history',
        TermValueByLanguage: {
            'pt-br': 'A história da Picanha Coin ($BASE-ANGULAR-PROJECT-PUBLIC-NAME-01)',
            'en-us': 'The history of Picanha Coin ($BASE-ANGULAR-PROJECT-PUBLIC-NAME-01)',
        },
    },
    {
        TermKey: 'home-origin-title',
        TermValueByLanguage: {
            'pt-br': 'Origem',
            'en-us': 'Origin',
        },
    },
    {
        TermKey: 'home-brazil-2022-election-history',
        TermValueByLanguage: {
            'pt-br':
                'No Brasil, as eleições presidenciais de 2022 foram muito marcantes por terem sido extremamente polarizadas. Durante o período de candidatura, “Lula”, um dos ex-presidentes, disse que, se fosse eleito, as pessoas pobres poderiam comer BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 (um corte nobre de boi).',
            'en-us':
                'In Brazil, the 2022 presidential election was very memorable for being extremely polarized. During the candidacy period, “Lula,” one of the former presidents, said that if he were elected, poor people would be able to eat BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 (a prime cut of beef).',
        },
    },
    {
        TermKey: 'home-candidate-elected',
        TermValueByLanguage: {
            'pt-br': 'Esse candidato foi eleito',
            'en-us': 'This candidate was elected',
        },
    },
    {
        TermKey: 'home-BASE-ANGULAR-PROJECT-01-de-lula-meme',
        TermValueByLanguage: {
            'pt-br':
                'Mesmo hoje, muito tempo depois das eleições, a polarização política continua. E, desde então, a “BASE-ANGULAR-PROJECT-01 de Lula” foi — e continua sendo — um meme muito forte e reconhecido no Brasil, especialmente em discussões de política e em discursos de opositores.',
            'en-us':
                'Even today, long after the elections, political polarization continues. Since then, “Lula’s BASE-ANGULAR-PROJECT-01” has been—and continues to be—a strong and well-known meme in Brazil, especially in political discussions and in opponents’ speeches.',
        },
    },
    {
        TermKey: 'home-double-meaning',
        TermValueByLanguage: {
            'pt-br': 'Duplo sentido',
            'en-us': 'Double meaning',
        },
    },
    {
        TermKey: 'home-BASE-ANGULAR-PROJECT-01-symbol-meaning',
        TermValueByLanguage: {
            'pt-br':
                'O símbolo da BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 é $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01. Em português, “BASE-ANGULAR-PROJECT-01” é uma gíria para BASE-ANGULAR-PROJECT-PUBLIC-NAME-01.',
            'en-us':
                'The symbol of BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 is $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01. In Portuguese, “BASE-ANGULAR-PROJECT-01” is slang for BASE-ANGULAR-PROJECT-PUBLIC-NAME-01.',
        },
    },
    {
        TermKey: 'home-avoid-hands-on-your-BASE-ANGULAR-PROJECT-01s',
        TermValueByLanguage: {
            'pt-br': 'Evite que alguém passe a mão nas suas $BASE-ANGULAR-PROJECT-01s.',
            'en-us': 'Avoid someone getting their hands on your $BASE-ANGULAR-PROJECT-01s.',
        },
    },
    {
        TermKey: 'home-caution-with-scams-profiles-contracts-fakes',
        TermValueByLanguage: {
            'pt-br':
                'Cuidado com scams, <b>perfis</b>, <b>contratos</b> e <b>sites falsos</b>. Sempre busque links oficiais! Não confie em nenhum <b>site</b>/<b>pessoa</b> que peça sua <b>“seed phrase”</b>, <b>“private key”</b> nem em assinar contratos que não estejam <b>listados em canais oficiais</b>.',
            'en-us':
                'Be careful with scams, <b>profiles</b>, <b>contracts</b>, and <b>fake sites</b>. Always look for official links! Do not trust any <b>site</b>/<b>person</b> that asks for your <b>“seed phrase”</b>, <b>“private key”</b>, or to sign contracts not <b>listed on official channels</b>.',
        },
    },
    {
        TermKey: 'home-official-contracts',
        TermValueByLanguage: {
            'pt-br': 'Contratos oficiais',
            'en-us': 'Official contracts',
        },
    },
    {
        TermKey: 'home-BASE-ANGULAR-PROJECT-01',
        TermValueByLanguage: {
            'pt-br': 'BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 ($BASE-ANGULAR-PROJECT-PUBLIC-NAME-01):',
            'en-us': 'BASE-ANGULAR-PROJECT-PUBLIC-NAME-01 ($BASE-ANGULAR-PROJECT-PUBLIC-NAME-01):',
        },
    },

    // home security
    {
        TermKey: 'home-security-title',
        TermValueByLanguage: {
            'pt-br': 'Segurança',
            'en-us': 'Security',
        },
    },

    // home about the team
    {
        TermKey: 'home-about-the-team-title',
        TermValueByLanguage: {
            'pt-br': 'Sobre o time',
            'en-us': 'About the team',
        },
    },
    {
        TermKey: 'home-who-conceived-BASE-ANGULAR-PROJECT-01-title',
        TermValueByLanguage: {
            'pt-br': 'Quem idealizou a $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01',
            'en-us': 'Who conceived $BASE-ANGULAR-PROJECT-PUBLIC-NAME-01',
        },
    },
    {
        TermKey: 'home-one-developer',
        TermValueByLanguage: {
            'pt-br': '1 dev',
            'en-us': '1 dev',
        },
    },
    {
        TermKey: 'home-team-is-one-dev',
        TermValueByLanguage: {
            'pt-br': 'Por enquanto, “o time” é apenas 1 dev',
            'en-us': 'For now, “the team” is just 1 dev',
        },
    },
    {
        TermKey: 'home-about-the-1',
        TermValueByLanguage: {
            'pt-br': 'Sobre o dev',
            'en-us': 'About the dev',
        },
    },
    {
        TermKey: 'home-3d-artist-gamedev-cs-player-hardware-nerd',
        TermValueByLanguage: {
            'pt-br': 'Artista 3D, game dev, jogador de Counter-Strike e nerd de hardware',
            'en-us': '3D artist, game dev, Counter-Strike player, and hardware nerd',
        },
    },
    {
        TermKey: 'home-tech-enthusiast-programmer-crypto-gaming-loss',
        TermValueByLanguage: {
            'pt-br':
                'Sou entusiasta de tecnologia, programador, e já perdi alguns milhares de reais em 2022 jogando criptojogos de qualidade questionável e com pouca transparência.',
            'en-us':
                'I am a technology enthusiast and programmer, and I lost several thousand reais in 2022 playing crypto games of questionable quality with poor transparency.',
        },
    },
    {
        TermKey: 'home-my-goal-transparency',
        TermValueByLanguage: {
            'pt-br':
                'Meu objetivo é tentar fazer diferente, sempre focando na maior transparência possível e no bom senso.',
            'en-us':
                'My goal is to do things differently, always focusing on maximum transparency and common sense.',
        },
    },
    {
        TermKey: 'home-anonymity-title',
        TermValueByLanguage: {
            'pt-br': 'Anonimato',
            'en-us': 'Anonymity',
        },
    },
    {
        TermKey: 'home-prefer-not-anonymous-but-didnt-calculate-implications',
        TermValueByLanguage: {
            'pt-br':
                'Preferiria não estar anônimo, para não parecer um “scamzão”, mas ainda não avaliei as implicações (boas e ruins) de me identificar; então vou me manter assim por ora.',
            'en-us':
                "I would prefer not to be anonymous—so I don't look like a big scam—but I haven't yet considered the implications (good and bad) of identifying myself, so I'll remain like this for now.",
        },
    },
    {
        TermKey: 'home-medium-long-term',
        TermValueByLanguage: {
            'pt-br': 'Médio/longo prazo',
            'en-us': 'Medium/long term',
        },
    },
    {
        TermKey: 'home-no-pump-and-dump-no-rug-pull-long-term-goals',
        TermValueByLanguage: {
            'pt-br':
                'Não pretendo fazer pump and dump nem fazer rug pull — nem tenho dinheiro para isso. Independentemente de este projeto dar certo ou não, minha meta é o médio/longo prazo e poder financiar meus próximos projetos maiores.',
            'en-us':
                "I don't intend to pump and dump or do a rug pull—and I don't have the money for that. Whether this project succeeds or not, my goal is the medium/long term and to fund my next, bigger projects.",
        },
    },
    {
        TermKey: 'home-hope-not-to-become-what-im-trying-to-destroy',
        TermValueByLanguage: {
            'pt-br': '~Espero não me tornar o que estou tentando destruir',
            'en-us': '~I hope not to become what I am trying to destroy',
        },
    },



] as const;

export const DEFAULT_LOCALIZATION_CONFIG: LocalizationConfig = {
    storageKey: 'config-language-preference-id',
    defaultLanguageId: 'pt-br',
    languages: RAW_LANGUAGE_OPTIONS.map(({ Id, Name, FlagIconName }) => ({
        id: Id,
        name: Name,
        flagIconName: FlagIconName,
    })),
    terms: RAW_TERMS.map(({ TermKey, TermValueByLanguage }) => ({
        key: TermKey,
        values: TermValueByLanguage,
    })),
};
