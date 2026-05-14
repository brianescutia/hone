import { useMemo, useState } from 'react';

export default function ExpenseCalculator({ listing }) {
  const lowestRent = listing?.priceMin || 0;
  const lowestDeposit = listing?.floorPlans?.[0]?.deposit || 0;

  const [rent, setRent] = useState(lowestRent);
  const [roommates, setRoommates] = useState(1);
  const [utilities, setUtilities] = useState(60);
  const [internet, setInternet] = useState(30);
  const [parking, setParking] = useState(0);
  const [petFee, setPetFee] = useState(0);
  const [other, setOther] = useState(0);

  const perPerson = useMemo(() => {
    const split = Math.max(1, Number(roommates) || 1);
    const total = Number(rent) / split +
      Number(utilities) +
      Number(internet) +
      Number(parking) +
      Number(petFee) +
      Number(other);
    return Math.round(total);
  }, [rent, roommates, utilities, internet, parking, petFee, other]);

  const moveInEstimate = useMemo(
    () => Math.round(Number(rent) + Number(lowestDeposit)),
    [rent, lowestDeposit]
  );

  return (
    <div className="bg-cream-100 rounded-2xl p-4 sm:p-6">
      <h3 className="section-cap text-center mb-4">Your monthly expense</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Base rent ($)">
          <input
            type="number"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            className="input bg-white"
          />
        </Field>
        <Field label="Roommates (incl. you)">
          <input
            type="number"
            min={1}
            value={roommates}
            onChange={(e) => setRoommates(e.target.value)}
            className="input bg-white"
          />
        </Field>
        <Field label="Utilities ($/mo)">
          <input
            type="number"
            value={utilities}
            onChange={(e) => setUtilities(e.target.value)}
            className="input bg-white"
          />
        </Field>
        <Field label="Internet ($/mo)">
          <input
            type="number"
            value={internet}
            onChange={(e) => setInternet(e.target.value)}
            className="input bg-white"
          />
        </Field>
        <Field label="Parking ($/mo)">
          <input
            type="number"
            value={parking}
            onChange={(e) => setParking(e.target.value)}
            className="input bg-white"
          />
        </Field>
        <Field label="Pet fee ($/mo)">
          <input
            type="number"
            value={petFee}
            onChange={(e) => setPetFee(e.target.value)}
            className="input bg-white"
          />
        </Field>
        <Field label="Other ($/mo)">
          <input
            type="number"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            className="input bg-white"
          />
        </Field>
      </div>

      <div className="mt-5 bg-white rounded-2xl p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-ink-500">
          Your estimated monthly living expense
        </div>
        <div className="text-3xl font-semibold mt-1">${perPerson.toLocaleString()}</div>
        {lowestDeposit > 0 && (
          <div className="text-sm text-ink-500 mt-2">
            Estimated move-in cost (rent + deposit): ${moveInEstimate.toLocaleString()}
          </div>
        )}
      </div>
      <p className="text-xs text-ink-500 mt-2 text-center">
        Estimate only. Actual costs depend on lease terms and personal usage.
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
