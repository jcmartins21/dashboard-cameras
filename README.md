# Sistema de Gerenciamento de Câmeras

Este é um sistema de gerenciamento de câmeras desenvolvido com Streamlit, permitindo o controle e monitoramento de câmeras de segurança.

## Funcionalidades

- Dashboard com estatísticas gerais
- Gerenciamento de modelos de câmera
- Gerenciamento de câmeras individuais
- Monitoramento de armazenamento e incidentes
- Interface intuitiva e responsiva

## Requisitos

- Python 3.8+
- Streamlit
- SQLite3
- Pillow
- Pandas

## Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_SEU_REPOSITÓRIO]
cd [NOME_DO_DIRETÓRIO]
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

## Executando Localmente

Para executar o aplicativo localmente:

```bash
streamlit run streamlit_app.py
```

O aplicativo estará disponível em `http://localhost:8501`

## Deploy no Streamlit Cloud

1. Crie uma conta no [Streamlit Cloud](https://streamlit.io/cloud)
2. Conecte sua conta do GitHub
3. Clique em "New app"
4. Selecione o repositório e o arquivo `streamlit_app.py`
5. Clique em "Deploy"

## Estrutura do Projeto

```
.
├── streamlit_app.py      # Aplicação principal
├── requirements.txt      # Dependências do projeto
├── static/              # Arquivos estáticos
│   └── images/
│       └── models/      # Imagens dos modelos de câmera
└── cameras.db           # Banco de dados SQLite
```

## Contribuindo

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes. 