#include "navyunit.h"
#include "utils.h"
#include "logger.h"
#include "commands.h"
#include "scheduler.h"
#include "defines.h"
#include "unitsManager.h"

#include <GeographicLib/Geodesic.hpp>
using namespace GeographicLib;

extern Scheduler* scheduler;
extern UnitsManager* unitsManager;

/* Navy Unit */
NavyUnit::NavyUnit(json::value json, unsigned int ID) : Unit(json, ID)
{
	log("New Navy Unit created with ID: " + to_string(ID));

	setCategory("NavyUnit");
	setDesiredSpeed(10);
};

void NavyUnit::setDefaults(bool force)
{
	if (!getAlive() || !getControlled() || getHuman() || !getIsLeader()) return;

	/* Set the default IDLE state */
	setState(State::IDLE);

	/* Set the default options */
	setROE(ROE::OPEN_FIRE_WEAPON_FREE, force);
	setOnOff(onOff, force);
	setFollowRoads(followRoads, force);
}

void NavyUnit::setState(unsigned char newState)
{
	/************ Perform any action required when LEAVING a state ************/
	if (newState != state) {
		switch (state) {
		case State::IDLE: {
			break;
		}
		case State::REACH_DESTINATION: {
			break;
		}
		case State::FIRE_AT_AREA: {
			setTargetPosition(Coords(NULL));
			break;
		}
		default:
			break;
		}
	}

	/************ Perform any action required when ENTERING a state ************/
	switch (newState) {
	case State::IDLE: {
		clearActivePath();
		resetActiveDestination();
		break;
	}
	case State::REACH_DESTINATION: {
		resetActiveDestination();
		break;
	}
	case State::FIRE_AT_AREA: {
		clearActivePath();
		resetActiveDestination();
		break;
	}
	default:
		break;
	}

	if (newState != state)
		resetTask();

	log(unitName + " setting state from " + to_string(state) + " to " + to_string(newState));
	state = newState;

	triggerUpdate(DataIndex::state);
}

void NavyUnit::AIloop()
{
	switch (state) {
	case State::IDLE: {
		setTask("Idle");
		if (getHasTask())
			resetTask();
		break;
	}
	case State::REACH_DESTINATION: {
		string enrouteTask = "{}";
		bool looping = false;

		if (activeDestination == NULL || !getHasTask())
		{
			if (!setActiveDestination())
				setState(State::IDLE);
			else
				goToDestination(enrouteTask);
		}
		else {
			if (isDestinationReached(NAVY_DEST_DIST_THR)) {
				if (updateActivePath(looping) && setActiveDestination())
					goToDestination(enrouteTask);
				else
					setState(State::IDLE);
			}
		}
		break;
	}
	case State::FIRE_AT_AREA: {
		setTask("Firing at area");

		if (!getHasTask()) {
			std::ostringstream taskSS;
			taskSS << "{id = 'FireAtPoint', lat = " << targetPosition.lat << ", lng = " << targetPosition.lng << ", radius = 1000}";
			Command* command = dynamic_cast<Command*>(new SetTask(groupName, taskSS.str()));
			scheduler->appendCommand(command);
			setHasTask(true);
		}
	}
	default:
		break;
	}
}

void NavyUnit::changeSpeed(string change)
{
	if (change.compare("stop") == 0)
		setState(State::IDLE);
	else if (change.compare("slow") == 0)
		setDesiredSpeed(getDesiredSpeed() - knotsToMs(5));
	else if (change.compare("fast") == 0)
		setDesiredSpeed(getDesiredSpeed() + knotsToMs(5));

	if (getDesiredSpeed() < 0)
		setDesiredSpeed(0);
}

void NavyUnit::setOnOff(bool newOnOff, bool force)
{
	if (newOnOff != onOff || force) {
		Unit::setOnOff(newOnOff, force);
		Command* command = dynamic_cast<Command*>(new SetOnOff(groupName, onOff));
		scheduler->appendCommand(command);
	}
}