# Cycles - Shape Up Planning Tool

A full-stack web application for planning engineering cycles in a Shape Up environment. Easily manage cycles, pitches, engineer assignments, and visualize capacity at a glance.

## Features

- **Cycle Management**: Create and manage 6-week development cycles
- **Engineer Capacity**: Track individual engineer availability per cycle
- **Pitch Planning**: Add pitches with estimates, priority, and documentation links
- **Drag-and-Drop Assignment**: Intuitively assign engineers to pitches
- **Real-time Capacity Tracking**: See remaining capacity for engineers and pitches
- **Load Balancing**: Visual indicators for over/under capacity

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Drag & Drop**: @dnd-kit/core
- **Notifications**: react-hot-toast

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. **Clone the repository**

```bash
cd cycles
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cycles?schema=public"
```

4. **Set up the database**

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed
```

5. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Managing Cycles

1. Click "Create Cycle" on the home page
2. Enter cycle name, date range, and optional description
3. Click on a cycle to view and manage it

### Adding Engineers to a Cycle

1. Navigate to a cycle detail page
2. Click "Add" in the Engineers panel
3. Select an engineer and specify their available weeks

### Adding Pitches

1. Navigate to a cycle detail page
2. Click "Add Pitch" in the Pitches panel
3. Enter pitch details including title, estimate, and optional priority

### Assigning Engineers to Pitches

1. Drag an engineer card from the left panel
2. Drop onto a pitch card in the right panel
3. Enter the number of weeks to allocate
4. Click "Assign" to confirm

### Managing Assignments

- Click on the weeks value to edit an assignment
- Hover over an assignment and click the trash icon to remove it

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cycles` | List all cycles |
| POST | `/api/cycles` | Create a cycle |
| GET | `/api/cycles/[id]` | Get cycle details |
| PATCH | `/api/cycles/[id]` | Update a cycle |
| DELETE | `/api/cycles/[id]` | Delete a cycle |
| GET | `/api/engineers` | List all engineers |
| POST | `/api/engineers` | Create an engineer |
| POST | `/api/engineers/[id]/capacities` | Set engineer capacity for a cycle |
| POST | `/api/pitches` | Create a pitch |
| PATCH | `/api/pitches/[id]` | Update a pitch |
| DELETE | `/api/pitches/[id]` | Delete a pitch |
| POST | `/api/assignments` | Create/update an assignment |
| PATCH | `/api/assignments/[id]` | Update assignment weeks |
| DELETE | `/api/assignments/[id]` | Remove an assignment |

## Data Model

- **Engineer**: Team members with name and email
- **Cycle**: Time-boxed development periods (typically 6 weeks)
- **EngineerCycleCapacity**: Available weeks per engineer per cycle
- **Pitch**: Project proposals with estimates
- **Assignment**: Engineer-to-pitch allocation with week count

## Validation Rules

- Engineers cannot be assigned more weeks than their capacity
- Pitches cannot be over-staffed beyond their estimate
- All week values must be positive decimals

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio
npm run db:studio
```

## License

MIT




