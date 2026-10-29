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
git clone https://github.com/danavacarciuc/stayfinder.git
cd stayfinder
npm install
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
## Algorithms
StayFinder's core differentiator is its data-driven recommendation and analytics layer:
- **Personalized recommendation engine** — a weighted scoring model that ranks properties for each user based on a combination of booking history, wishlist activity, and review interactions. Each signal is assigned a weight, and properties are scored and ranked accordingly.
- **Similar properties (content-based filtering)** — uses **cosine similarity** over property feature vectors (price, location, amenities, type, etc.) to surface properties similar to the one a user is currently viewing.
- **Revenue forecasting** — the host analytics dashboard applies **linear regression** over historical booking data to project expected future revenue.
These algorithms are documented in detail in the thesis, including the theoretical foundations in Chapter 2 and the implementation specifics in Chapter 3.
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
