import streamlit as st
import sqlite3
from datetime import datetime
import os
from PIL import Image
import pandas as pd

# Configuração da página
st.set_page_config(
    page_title="Sistema de Câmeras",
    page_icon="📸",
    layout="wide"
)

# Conexão com o banco de dados
def get_db_connection():
    conn = sqlite3.connect('cameras.db')
    conn.row_factory = sqlite3.Row
    return conn

# Inicialização do banco de dados
def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Criar tabela de modelos de câmera
    c.execute('''
        CREATE TABLE IF NOT EXISTS camera_model (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Criar tabela de câmeras
    c.execute('''
        CREATE TABLE IF NOT EXISTS camera (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model TEXT NOT NULL,
            serial_number TEXT UNIQUE NOT NULL,
            installation_date TIMESTAMP NOT NULL,
            location_x REAL NOT NULL,
            location_y REAL NOT NULL,
            image_storage_gb REAL DEFAULT 0.0,
            incidents_captured INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    conn.commit()
    conn.close()

# Inicializar o banco de dados
init_db()

# Sidebar
st.sidebar.title("Menu")
page = st.sidebar.radio("Navegação", ["Dashboard", "Gerenciar Câmeras", "Gerenciar Modelos"])

if page == "Dashboard":
    st.title("📸 Dashboard de Câmeras")
    
    # Estatísticas gerais
    conn = get_db_connection()
    total_cameras = conn.execute('SELECT COUNT(*) FROM camera').fetchone()[0]
    total_models = conn.execute('SELECT COUNT(*) FROM camera_model').fetchone()[0]
    total_storage = conn.execute('SELECT SUM(image_storage_gb) FROM camera').fetchone()[0] or 0
    total_incidents = conn.execute('SELECT SUM(incidents_captured) FROM camera').fetchone()[0] or 0
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total de Câmeras", total_cameras)
    with col2:
        st.metric("Modelos de Câmera", total_models)
    with col3:
        st.metric("Armazenamento Total (GB)", f"{total_storage:.2f}")
    with col4:
        st.metric("Incidentes Registrados", total_incidents)
    
    # Lista de câmeras
    st.subheader("Câmeras Ativas")
    cameras = pd.read_sql_query('SELECT * FROM camera', conn)
    st.dataframe(cameras)
    
    conn.close()

elif page == "Gerenciar Câmeras":
    st.title("Gerenciar Câmeras")
    
    # Formulário para adicionar nova câmera
    with st.form("nova_camera"):
        st.subheader("Adicionar Nova Câmera")
        
        # Buscar modelos disponíveis
        conn = get_db_connection()
        models = conn.execute('SELECT name FROM camera_model').fetchall()
        model_names = [model['name'] for model in models]
        
        model = st.selectbox("Modelo", model_names)
        serial_number = st.text_input("Número de Série")
        installation_date = st.date_input("Data de Instalação")
        location_x = st.number_input("Localização X", format="%.6f")
        location_y = st.number_input("Localização Y", format="%.6f")
        
        submitted = st.form_submit_button("Adicionar Câmera")
        if submitted:
            try:
                conn.execute('''
                    INSERT INTO camera (model, serial_number, installation_date, location_x, location_y)
                    VALUES (?, ?, ?, ?, ?)
                ''', (model, serial_number, installation_date, location_x, location_y))
                conn.commit()
                st.success("Câmera adicionada com sucesso!")
            except sqlite3.IntegrityError:
                st.error("Erro: Número de série já existe!")
            except Exception as e:
                st.error(f"Erro ao adicionar câmera: {str(e)}")
        
        conn.close()

elif page == "Gerenciar Modelos":
    st.title("Gerenciar Modelos de Câmera")
    
    # Formulário para adicionar novo modelo
    with st.form("novo_modelo"):
        st.subheader("Adicionar Novo Modelo")
        
        name = st.text_input("Nome do Modelo")
        description = st.text_area("Descrição")
        image = st.file_uploader("Imagem do Modelo", type=['jpg', 'jpeg', 'png'])
        
        submitted = st.form_submit_button("Adicionar Modelo")
        if submitted:
            try:
                conn = get_db_connection()
                
                # Salvar imagem
                if image:
                    os.makedirs('static/images/models', exist_ok=True)
                    image_path = f"static/images/models/{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                    img = Image.open(image)
                    img.save(image_path)
                else:
                    image_path = None
                
                conn.execute('''
                    INSERT INTO camera_model (name, description, image_path)
                    VALUES (?, ?, ?)
                ''', (name, description, image_path))
                conn.commit()
                st.success("Modelo adicionado com sucesso!")
            except sqlite3.IntegrityError:
                st.error("Erro: Nome do modelo já existe!")
            except Exception as e:
                st.error(f"Erro ao adicionar modelo: {str(e)}")
            finally:
                conn.close()
    
    # Lista de modelos
    st.subheader("Modelos Cadastrados")
    conn = get_db_connection()
    models = pd.read_sql_query('SELECT * FROM camera_model', conn)
    st.dataframe(models)
    conn.close() 