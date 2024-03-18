import { useEffect, useState } from 'react';
import './App.css';
import { PublicClientApplication } from '@azure/msal-browser';
import { Text, PrimaryButton, Stack, DialogFooter, DialogType, Dialog, Spinner, SpinnerSize, List, TextField } from '@fluentui/react';
import Logo from './img/IOZ.png'

interface IParticipant {
  id: string,
  name: string,
  vote: number,
  votingId: string
}

const msalConfig = {
  auth: {
    clientId: 'eac44f26-f2c9-4289-9c0b-262421ae4db3',
    authority: 'https://login.microsoftonline.com/cf3767e0-0cba-4bd6-9e43-02cf44292a95',
    redirectUri: process.env.REACT_APP_API_REDIRECTURL,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);
const scopes = ["user.read"];
await msalInstance.initialize();

function App() {
  const [msalToken, setMsalToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDialogVisible, setIsDialogVisible] = useState<boolean>(false);
  const [history, setHistory] = useState([]);
  const [votingDetails, setVotingDetails] = useState<undefined | any>(null);
  const [isDetailsDialogVisible, setIsDetailsDialogVisible] = useState<boolean>(false);
  const [isNewVotingDialogVisible, setIsNewVotingDialogVisible] = useState<boolean>(false);
  const [newVotingTitle, setNewVoting] = useState<string>('');
  const [showVoting, setShowVoting] = useState<boolean>(false);
  const [userName, setUserName] = useState<string | undefined>('');
  const [votingId, setVotingId] = useState<string>("");
  const [participants, setParticipants] = useState<IParticipant[]>([]);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [currentParticipantId, setcurrentParticipantId] = useState<string | null>('');
  const [votingFinished, setvotingFinished] = useState<boolean>(false);
  const [votingResult, setVotingResult] = useState<number>(-1);

  const finishVoting = async () => {
    const validVotes = participants.filter(p => p.vote !== -1).map(p => p.vote);
    const averageVote = validVotes.reduce((tot, vote) => tot + vote, 0) / validVotes.length;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_UPDATEVOTING}${votingId}${process.env.REACT_APP_API_UPDATEVOTINGCODE}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          result: averageVote,
          isActive: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedVoting = await response.json();
      localStorage.removeItem('ParticipantId');
      setvotingFinished(true);
      setVotingResult(updatedVoting.result)
      console.log('Voting finished:', updatedVoting);
    } catch (error) {
      console.error("Error finishing voting:", error);
    }
  };


  const updateVote = async (participantId: string | null, vote: number) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_UPDATEPARTICIPANT}${participantId}${process.env.REACT_APP_API_UPDATEPARTICIPANTCODE}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vote })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedParticipant = await response.json();
      console.log('Vote updated:', updatedParticipant);

    } catch (error) {
      console.error("Error updating vote:", error);
    }
  };


  const createNewParticipant = async (votingId: string, name: string | undefined) => {
    const requestBody = {
      votingId: votingId,
      name: name
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_CREATEPARTICIPANT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('New participant created:', data);
      setcurrentParticipantId(data.id);
      localStorage.setItem("ParticipantId", data.id)

    } catch (error) {
      console.error("Error creating new participant:", error);
    }
  };


  const createNewVoting = async () => {

    const body = {
      title: newVotingTitle,
      creator: userName
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_CREATEVOTINGS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('New voting created:', data);
      toggleNewVotingDialog();
      localStorage.setItem('ParticipantId', data.id);
      window.location.href = `${window.location.origin}/${data.id}`;

      createNewParticipant(data.id, userName);

    } catch (error) {
      console.error("Error creating new voting:", error);
    }
  };


  const fetchVotingDetails = async (votingId: string) => {
    const response = await fetch(`${process.env.REACT_APP_API_GETVOTING}${votingId}${process.env.REACT_APP_API_GETVOTINGCODE}`);
    if (response.ok) {
      const data = await response.json();
      setVotingDetails(data);
      setIsDetailsDialogVisible(true);
      setIsDialogVisible(false);
    } else {
      console.error('Failed to fetch voting details');
    }
  };

  const fetchParticipants = async (votingId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_GETVOTING}${votingId}${process.env.REACT_APP_API_GETVOTINGCODE}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setParticipants(data.participants);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };


  useEffect(() => {
    const id = window.location.pathname.substring(1);
    if (id) {
      setVotingId(id);
      setShowVoting(true);
      fetchParticipants(id);
      if (localStorage.getItem('ParticipantId')) {
        setcurrentParticipantId(localStorage.getItem('ParticipantId'));
      }
      else{
        createNewParticipant(id,userName);
      }
    } else {
      setShowVoting(false);
    }
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_GETALLVOTINGS}`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setHistory(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching history:', error);
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    const handleLogin = async () => {
      if (!msalToken) {
        try {
          const tokenResponse = await msalInstance.handleRedirectPromise();
          if (tokenResponse) {
            msalInstance.setActiveAccount(tokenResponse.account);
            window.location.reload();
          } else {
            msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
          }

          const account = msalInstance.getActiveAccount();
          setUserName(account?.name)
          if (account && tokenResponse) {
            console.log("[AuthService] Got valid accountObj and tokenResponse");
            setMsalToken(tokenResponse.accessToken);
          } else if (account) {
            console.log("[AuthService] User has logged in, but no tokens.");
            try {
              const silentTokenResponse = await msalInstance.acquireTokenSilent({ account, scopes });
              setMsalToken(silentTokenResponse.accessToken);
              console.log("[AuthService] Token acquired")
            } catch (error) {
              console.log("[AuthService] Token could not be acquired silently");
              await msalInstance.acquireTokenRedirect({ account, scopes });
            }
          } else {
            console.log("[AuthService] No accountObject or tokenResponse present. User must now login.");
            await msalInstance.loginRedirect({ scopes });
          }
        } catch (error) {
          console.error("[AuthService] Failed to handleRedirectPromise()", error);
        }
        finally {
          setIsLoading(false);
        }
      }
      else {
        setIsLoading(false);
      }
    };

    handleLogin();
  });

  const toggleDialog = () => setIsDialogVisible(!isDialogVisible);

  const toggleNewVotingDialog = () => setIsNewVotingDialogVisible(!isNewVotingDialogVisible);


  const closeDetailsDialog = () => {
    setIsDetailsDialogVisible(false);
    setIsDialogVisible(true);
  };

  const handleInputChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewVoting(event.currentTarget.value);
  };

  const handleVote = (vote: number) => {
    setCurrentVote(vote);
    updateVote(currentParticipantId, vote);
  };


  return (
    isLoading || !msalToken ? (
      <Spinner size={SpinnerSize.large} label="Loading..." ariaLive="assertive" labelPosition="right" />
    ) : (
      <Stack>
        <Stack horizontalAlign='end' className='Username'>
          <Text variant='large'>{userName}</Text>
          </Stack>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className='Navigation'>
          <Stack horizontal verticalAlign="center">
            <img src={Logo} alt="Logo IOZ" style={{ width: '75px', marginRight: '10px' }} />
            <Text variant="xxLarge">Project Estimator</Text>
          </Stack>
          <Stack horizontal horizontalAlign="end">
            <Text variant='xLarge' onClick={toggleDialog}>History</Text>
          </Stack>
        </Stack>


        {!showVoting ? (
          <Stack grow horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '90vh' } }}>
            <Stack horizontalAlign="center" verticalAlign="center">
              <PrimaryButton text="Neue Schätzung" onClick={toggleNewVotingDialog} className='NewVoting' />
            </Stack>
          </Stack>
        ) : votingFinished ? (
          <Stack>
            <Text variant="xLarge">Voting Ergebnis: {votingResult.toFixed(1)}</Text>
            <Stack tokens={{ childrenGap: 10 }}>
              <Text variant="large">Abstimmungsergebnisse:</Text>
              {participants.map((participant) => (
                <Text key={participant.id}>
                  {participant.name}: {participant.vote !== -1 ? participant.vote : "Noch nicht abgestimmt"}
                </Text>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack>
            <Stack tokens={{ childrenGap: 10 }}>
              <Text variant="large">Teilnehmer:</Text>
              {participants.map((participant) => (
                <Text key={participant.id}>
                  {participant.name}{participant.id === currentParticipantId ? ` Voting: ${participant.vote !== -1 ? participant.vote : "Noch nicht abgestimmt"}` : ''}
                </Text>
              ))}
            </Stack>

            <Stack horizontal tokens={{ childrenGap: 10 }} wrap>
              <Text variant="large">Wählen:</Text>
              {[1, 2, 3, 5, 8, 13, 21, 34, 55].map((vote) => (
                <PrimaryButton
                  key={vote}
                  text={vote.toString()}
                  onClick={() => handleVote(vote)}
                  style={{ backgroundColor: currentVote === vote ? 'lightblue' : '' }}
                />
              ))}
            </Stack>
            <PrimaryButton text="Abschliessen" onClick={finishVoting} className='margin' />
          </Stack>
        )}


        <Dialog
          hidden={!isDialogVisible}
          onDismiss={toggleDialog}
          dialogContentProps={{
            type: DialogType.normal,
            title: '',
          }}
          modalProps={{
            isBlocking: true,
          }}
          minWidth={1000}
        >
          <Stack horizontalAlign="center">
            <Text variant="xxLarge" className='HistoryHeader'>History</Text>
          </Stack>
          <List
            items={history}
            onRenderCell={(item: any, index) => (
              item ? (
                <div className='VotingBox' key={item.id}>
                  <Text className='HistoryTitle'>{item.title}</Text>
                  <Text className='HistoryResult'>Ergebnis: {item.result}</Text>
                  <PrimaryButton text="Details" onClick={() => fetchVotingDetails(item.id)} />
                </div>
              ) : (
                <Text key={`empty-${index}`}>Item konnte nicht geladen werden</Text>
              )
            )}
          />
          <DialogFooter>
            <PrimaryButton onClick={toggleDialog} text="Close" />
          </DialogFooter>
        </Dialog>

        <Dialog
          hidden={!isDetailsDialogVisible}
          onDismiss={closeDetailsDialog}
          dialogContentProps={{
            type: DialogType.largeHeader,
            title: votingDetails?.title || 'Neues Projekt',
            styles: {
              title: {
                fontWeight: 'normal',
                fontSize: '24px',
                margin: '20px 0',
                textAlign: 'center',
                color: 'black'
              }
            }
          }}
          modalProps={{
            isBlocking: false,
          }}
          minWidth={600}
        >
          <Stack tokens={{ childrenGap: 20 }}>
            <Stack horizontalAlign="center" tokens={{ childrenGap: 20 }}>
              <Text variant="xLarge">Ergebnis</Text>
              <Text variant="superLarge" className='DetailResult'>{votingDetails?.result}</Text>
            </Stack>

            <Stack horizontal tokens={{ childrenGap: 50 }} horizontalAlign="start">
              <Stack className='DetailsCreation'>
                <Text variant="medium">Erstellt von {votingDetails?.creator}</Text>
                <Text variant="medium">Erstellt am {votingDetails?.date}</Text>
              </Stack>

              <Stack className='DetailsParticipants'>
                <Text variant="medium">Teilnehmer</Text>
                {votingDetails?.participants.map((participant: IParticipant) => (
                  <Stack
                    horizontal
                    horizontalAlign='start'
                    className='DetailsDetailsParticipants'
                    key={participant.id}
                  >
                    <Stack horizontalAlign='start' className='DetailParticipantName'>
                      <Text variant="medium">{participant.name}</Text>
                    </Stack>
                    <Stack horizontalAlign='end' className='DetailParticipantVote'>
                      <Text variant="medium">Schätzung: {participant.vote}</Text>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Stack>

          <DialogFooter>
            <PrimaryButton onClick={closeDetailsDialog} text="Close" />
          </DialogFooter>
        </Dialog>

        <Dialog
          hidden={!isNewVotingDialogVisible}
          onDismiss={toggleNewVotingDialog}
          dialogContentProps={{
            type: DialogType.largeHeader,
            title: 'Neue Schätzung erstellen',
            styles: {
              title: {
                fontSize: '23px',
                textAlign: 'center',
                color: 'black'
              }
            }
          }}

          modalProps={{
            isBlocking: false,
          }}
        >
          <Stack tokens={{ childrenGap: 15 }}>
            <TextField label="Name" placeholder="Name" value={newVotingTitle} onChange={(event) => handleInputChange(event)} />

            <PrimaryButton text="Erstellen" onClick={createNewVoting} className="CreateVotingButton" />
          </Stack>
        </Dialog>
      </Stack>
    )
  );

}

export default App;
