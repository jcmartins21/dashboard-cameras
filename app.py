from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cameras.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['DEBUG'] = True  # Ativando modo debug
app.config['UPLOAD_FOLDER'] = 'static/images/models'
db = SQLAlchemy(app)

# Modelo de dados para as câmeras
class Camera(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    model = db.Column(db.String(100), nullable=False)
    serial_number = db.Column(db.String(100), unique=True, nullable=False)
    installation_date = db.Column(db.DateTime, nullable=False)
    location_x = db.Column(db.Float, nullable=False)  # Coordenada X no mapa
    location_y = db.Column(db.Float, nullable=False)  # Coordenada Y no mapa
    image_storage_gb = db.Column(db.Float, default=0.0)
    incidents_captured = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active')

# Modelo de dados para os modelos de câmera
class CameraModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    image_path = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.now)

# Rotas principais
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/camera/<model>')
def camera_model(model):
    return render_template('camera_model.html', model=model)

# API endpoints
@app.route('/api/cameras/all')
def get_all_cameras():
    cameras = Camera.query.all()
    return jsonify([{
        'id': cam.id,
        'model': cam.model,
        'serial_number': cam.serial_number,
        'installation_date': cam.installation_date.isoformat(),
        'location': {'x': cam.location_x, 'y': cam.location_y},
        'image_storage_gb': cam.image_storage_gb,
        'incidents_captured': cam.incidents_captured,
        'status': cam.status
    } for cam in cameras])

@app.route('/api/cameras/<model>')
def get_cameras_by_model(model):
    cameras = Camera.query.filter_by(model=model).all()
    return jsonify([{
        'id': cam.id,
        'model': cam.model,
        'serial_number': cam.serial_number,
        'installation_date': cam.installation_date.isoformat(),
        'location': {'x': cam.location_x, 'y': cam.location_y},
        'image_storage_gb': cam.image_storage_gb,
        'incidents_captured': cam.incidents_captured,
        'status': cam.status
    } for cam in cameras])

@app.route('/api/camera/<int:camera_id>')
def get_camera_details(camera_id):
    camera = Camera.query.get_or_404(camera_id)
    return jsonify({
        'id': camera.id,
        'model': camera.model,
        'serial_number': camera.serial_number,
        'installation_date': camera.installation_date.isoformat(),
        'location': {'x': camera.location_x, 'y': camera.location_y},
        'image_storage_gb': camera.image_storage_gb,
        'incidents_captured': camera.incidents_captured,
        'status': camera.status
    })

# Novas rotas para gerenciamento de modelos e câmeras
@app.route('/api/models', methods=['GET'])
def get_models():
    models = CameraModel.query.all()
    return jsonify([{
        'id': model.id,
        'name': model.name,
        'description': model.description,
        'image_path': model.image_path,
        'created_at': model.created_at.isoformat()
    } for model in models])

@app.route('/api/models', methods=['POST'])
def create_model():
    data = request.form
    image = request.files.get('image')
    
    if not image:
        return jsonify({'error': 'Imagem é obrigatória'}), 400
    
    # Criar diretório se não existir
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Salvar imagem
    filename = f"{data['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image.save(image_path)
    
    # Criar modelo
    model = CameraModel(
        name=data['name'],
        description=data['description'],
        image_path=filename
    )
    db.session.add(model)
    db.session.commit()
    
    # Criar a primeira câmera vinculada ao modelo
    camera = Camera(
        model=data['name'],
        serial_number=data['serial_number'],
        installation_date=datetime.fromisoformat(data['installation_date']),
        image_storage_gb=float(data['image_storage']),
        incidents_captured=int(data['incidents_captured']),
        status='active'
    )
    db.session.add(camera)
    db.session.commit()
    
    return jsonify({
        'id': model.id,
        'name': model.name,
        'description': model.description,
        'image_path': model.image_path
    })

@app.route('/api/cameras', methods=['POST'])
def create_camera():
    data = request.json
    
    camera = Camera(
        model=data['model'],
        serial_number=data['serial_number'],
        installation_date=datetime.fromisoformat(data['installation_date']),
        
        image_storage_gb=float(data['image_storage']),
        incidents_captured=int(data['incidents_captured']),
        status='active'
    )
    
    db.session.add(camera)
    db.session.commit()
    
    return jsonify({
        'id': camera.id,
        'model': camera.model,
        'serial_number': camera.serial_number
    })

# Servir imagens de modelos corretamente
@app.route('/static/images/models/<filename>')
def serve_model_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/models/<int:model_id>', methods=['DELETE'])
def delete_model(model_id):
    model = CameraModel.query.get_or_404(model_id)
    # Excluir todas as câmeras desse modelo
    Camera.query.filter_by(model=model.name).delete()
    db.session.delete(model)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/cameras/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    camera = Camera.query.get_or_404(camera_id)
    db.session.delete(camera)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/cameras/<int:camera_id>/feed', methods=['POST'])
def feed_camera(camera_id):
    camera = Camera.query.get_or_404(camera_id)
    data = request.json
    gb = float(data.get('gb', 0))
    ocorr = int(data.get('ocorr', 0))
    camera.image_storage_gb += gb
    camera.incidents_captured += ocorr
    db.session.commit()
    return jsonify({'success': True, 'new_gb': camera.image_storage_gb, 'new_ocorr': camera.incidents_captured})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 