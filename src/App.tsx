import { useEffect, useState } from 'react';
import './App.css';
import { PublicClientApplication } from '@azure/msal-browser';
import { Text, PrimaryButton, Stack, DialogFooter, DialogType, Dialog, Spinner, SpinnerSize, List, TextField } from '@fluentui/react';
import Logo from './img/IOZ.png'
import Connector from './SignalR/signalR-connection';

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
  const { events, ShowResults, joinGroup, ShowVote } = Connector();

  const [msalToken, setMsalToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDialogVisible, setIsDialogVisible] = useState<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);
  const [votingDetails, setVotingDetails] = useState<undefined | any>(null);
  const [isDetailsDialogVisible, setIsDetailsDialogVisible] = useState<boolean>(false);
  const [isNewVotingDialogVisible, setIsNewVotingDialogVisible] = useState<boolean>(false);
  const [newVotingTitle, setNewVoting] = useState<string>('');
  const [showVoting, setShowVoting] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>();
  const [votingId, setVotingId] = useState<string>("");
  const [participants, setParticipants] = useState<IParticipant[]>([]);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [currentParticipantId, setcurrentParticipantId] = useState<string | null>('');
  const [votingResult, setVotingResult] = useState<number>(-1);

  const finishVoting = async () => {
    const validVotes = participants.filter(p => p.vote !== -1).map(p => p.vote);
    var averageVote = 0;
    if (validVotes.length !== 0) {
      averageVote = validVotes.reduce((tot, vote) => tot + vote, 0) / validVotes.length;
    }

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
      ShowResults(updatedVoting.id, updatedVoting.result)

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

      const updatedParticipant: IParticipant = await response.json();
      fetchParticipants(updatedParticipant.votingId)
      ShowVote(updatedParticipant.votingId);
      console.log('Vote updated:', updatedParticipant);

    } catch (error) {
      console.error("Error updating vote:", error);
    }
  };

  const createNewParticipant = async (votingId: string, name: string) => {
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
      joinGroup(votingId);
      fetchParticipants(votingId);
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
      window.location.href = `${window.location.origin}/${data.id}`;

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
      setVotingDetails(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

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
        if (account !== null) {
          setUserName(account.name ?? "");
        }

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

  //SignalR
  useEffect(() => {
    const handleFinishReceived = (result: number, votingId: string) => {
      setVotingResult(result);
      fetchParticipants(votingId);
    };
    const handleJoinGroupReceived = (votingId: string) => {
      fetchParticipants(votingId);
    };
    const handleShowVoteReceived = (votingId: string) => {
      fetchParticipants(votingId);
    };

    events(handleFinishReceived, handleJoinGroupReceived, handleShowVoteReceived);
  }, [events]);

  useEffect(() => {
    handleLogin();
  });

  useEffect(() => {
    const id = window.location.pathname.substring(1);
    if (id && userName) {
      if (localStorage.getItem('ParticipantId')) {
        setcurrentParticipantId(localStorage.getItem('ParticipantId'));
        fetchParticipants(id);
      }
      else {
        createNewParticipant(id, userName ?? "");
      }
    }
  }, [userName])

  useEffect(() => {
    const id = window.location.pathname.substring(1);
    if (id) {
      setVotingId(id);
      if (!localStorage.getItem("VotingId")) {
        localStorage.setItem("VotingId", id);
      }
      else {
        if (localStorage.getItem("VotingId") !== id) {
          localStorage.clear();
          localStorage.setItem("VotingId", id)
        }
      }
      setShowVoting(true);
    } else {
      setShowVoting(false);
      localStorage.clear();
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
        const sortedHistory: any[] = [...data].sort((a: any, b: any) => {
          return Number(new Date(b.date)) - Number(new Date(a.date));
        });

        setHistory(sortedHistory);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching history:', error);
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

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

  const navigateHome = () => {
    window.location.href = window.location.origin;
  }

  return (
    isLoading || !msalToken ? (
      <Stack className='spinner'>
        <Spinner size={SpinnerSize.large} label="Loading..." ariaLive="assertive" labelPosition="right" />
      </Stack>
    ) : (
      <Stack>
        <Stack horizontalAlign='end' className='Username'>
          <Text variant='large'>{userName}</Text>
        </Stack>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className='Navigation'>
          <Stack horizontal verticalAlign="center" onClick={() => { navigateHome() }}>
            <img src={Logo} alt="Logo IOZ" className='logo' />
            <Text variant="xxLarge" className='navigationTextLink'>Project Estimator</Text>
          </Stack>
          <Stack horizontal horizontalAlign="end">
            <Text variant='xLarge' onClick={toggleDialog} className='navigationTextLink'>History</Text>
            {showVoting && (
              <Text variant='xLarge' className='navigationTextLink' style={{ marginLeft: '20px' }} onClick={() => {
                navigator.clipboard.writeText(window.location.href)
              }}>Teilen</Text>
            )}
          </Stack>
        </Stack>

        {!showVoting ? (
          <Stack horizontalAlign="center" className='OverviewContainer'>
            <PrimaryButton text="Neue Schätzung" onClick={toggleNewVotingDialog} className='NewVoting' />
            <Stack>
              <Text variant='xxLarge' className='ActiveHistoryInfo'>Aktive Votings:</Text>
              {history.filter(item => item.isActive).map((activeItem) => (
                <Stack className='ActiveHistoryContainer' key={activeItem.id} horizontalAlign='center' onClick={() => window.location.href = `${window.location.origin}/${activeItem.id}`}>
                  <Text className='ActiveHistoryTitle'>{activeItem.title}</Text>
                </Stack>
              ))}
            </Stack>
          </Stack>
        ) :
          <Stack>
            <Stack tokens={{ childrenGap: 10 }}>
              <Stack horizontalAlign='center'>
                <Text variant="xxLarge" className="votingTitle">{votingDetails ? votingDetails.title : 'Loading...'}</Text>
              </Stack>
              <Stack horizontalAlign='center'>
                <PrimaryButton text="Abschliessen" onClick={finishVoting} className='finishVotingButton' />
              </Stack>
              <Stack horizontalAlign='center'>
                <Stack className='participantContainer'>
                  <Stack className="participantGrid" wrap horizontal>
                    {participants.map((participant) => (
                      <Stack horizontalAlign='center' key={participant.id}>
                        <Text className='participantName' variant='xxLarge'>{participant.name}</Text>
                        <Stack horizontalAlign='center' verticalAlign='center' className={`participantCard ${votingDetails !== null && votingDetails.isActive ? participant.vote !== -1 && participant.id !== currentParticipantId ? 'participantVoted' : '' : ''} ${participant.id === currentParticipantId ? 'participantCurrent' : ''}`}>
                          <Text className='participantVote'>
                            {votingDetails !== null && votingDetails.isActive ? participant.id === currentParticipantId && participant.vote !== -1 ? `${participant.vote}` : '' : participant.vote === -1 ? '?' : participant.vote}
                          </Text>
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
            {votingDetails !== null && !votingDetails.isActive ?
              (
                <Stack horizontalAlign='center'>
                  <Stack className='buttonContainer' horizontalAlign='center'>
                    <Text variant="xxLarge" className='votingInfo'>Ergebnisse</Text>
                    <Stack tokens={{ childrenGap: 10 }}>
                      <Stack horizontal horizontalAlign='center' wrap tokens={{ childrenGap: 20 }}>
                        {
                          Object.values(participants.reduce((acc, participant) => {
                            const voteLabel = participant.vote !== -1 ? participant.vote.toString() : "?";
                            if (!acc[voteLabel]) {
                              acc[voteLabel] = { count: 1, vote: voteLabel };
                            } else {
                              acc[voteLabel].count++;
                            }
                            return acc;
                          }, {} as Record<string, { count: number; vote: string }>))
                            .map((item, index) => (
                              <Stack horizontalAlign='center'>
                                <Stack key={index} className='resultField' horizontalAlign='center' verticalAlign='center'>
                                  {item.vote}
                                </Stack>
                                <Text className='resultVoteText'>
                                  {item.count} {item.count === 1 ? "Vote" : "Votes"}
                                </Text>
                              </Stack>
                            ))
                        }
                        <Stack horizontalAlign='center'>
                          <Text className='resultText'>Ergebnis</Text>
                          <Text className='resultTextNumber'>{votingResult.toFixed(1)}</Text>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              ) : (
                <Stack horizontalAlign='center'>
                  <Stack className='buttonContainer' horizontalAlign='center'>
                    <Text variant="xxLarge" className='votingInfo'>Wähle eine Karte</Text>
                    <Stack horizontal wrap tokens={{ childrenGap: 10 }} >
                      {[1, 2, 3, 5, 8, 13, 21, 34, 55].map((vote) => (
                        <PrimaryButton
                          key={vote}
                          text={vote.toString()}
                          onClick={() => handleVote(vote)}
                          style={{ backgroundColor: currentVote === vote ? 'lightblue' : '' }}
                          className='votingButton'
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Stack>
              )}
          </Stack>
        }
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
                  <Text className='HistoryResult'>Ergebnis: {item.result.toFixed(1)}</Text>
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
              <Text variant="superLarge" className='DetailResult'>{votingDetails?.result.toFixed(1)}</Text>
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
                      <Text variant="medium">Schätzung: {participant.vote === -1 ? '?' : participant.vote}</Text>
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
