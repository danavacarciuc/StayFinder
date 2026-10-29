# StayFinder
StayFinder is a full-stack web platform for booking properties in a hotel-like rental system, built as part of a bachelor's thesis in Economic Informatics (ASE București, Facultatea de Cibernetică, Statistică și Informatică Economică).
## Features
- **Property search & filtering** — search bar with an embedded filters panel (price range, number of bedrooms, rating, facilities, sorting)
- **Interactive map** — property locations shown with clickable markers (Leaflet)
- **Personalized recommendations** — weighted scoring engine based on booking history, wishlist activity, and reviews
- **Similar properties** — cosine similarity algorithm for content-based recommendations
- **Reservations system** — availability checking, dynamic price calculation, and cancellation flow
- **Wishlist / favorites** — save and manage favorite properties
- **Host analytics dashboard** — revenue forecasting using linear regression
- **User profile** — trip history and paginated reviews
- **Account settings** — email change, password change, account deletion
## Tech Stack
**Backend:** Node.js, Express.js, SQLite
**Frontend:** HTML, CSS, vanilla JavaScript, FontAwesome
**Media storage:** Cloudinary
**Maps:** Leaflet
## Getting Started
### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm
### Installation
```bash
git clone https://github.com/<your-username>/stayfinder.git
cd stayfinder
npm install
```
### Environment Variables
Create a `.env` file in the project root with the required configuration (e.g. Cloudinary credentials, JWT secret, database path). Example:
```env
PORT=3000
JWT_SECRET=your_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
### Seeding the Database (optional)
To populate the database with sample data for demonstration purposes:
```bash
node seed_dana.js
```
### Running the Server
```bash
npm start
```
The application will be available at `http://localhost:3000` (or the port set in `.env`).
## Project Structure
```
stayfinder/
├── public/
│   ├── scripts/
│   │   └── favorites.js
│   ├── styles/
│   └── ...
├── routes/
├── seed_dana.js
├── server.js
├── package.json
└── README.md
```
## Author
**Dana Vacarciuc**
Bachelor's thesis — "Sistem informatic pentru rezervarea proprietăților în regim hotelier"
Supervisor: Conf. univ. dr. Felician Alecu
ASE București, Facultatea de Cibernetică, Statistică și Informatică Economică
## License
This project was developed for academic purposes as part of a bachelor's thesis.
