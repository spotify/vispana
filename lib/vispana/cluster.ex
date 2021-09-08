defmodule Vispana.Cluster do
  @moduledoc """
  The Cluster context.
  """

  import Logger, warn: false

  alias Vispana.Cluster.Node

  @doc """
  Returns the list of nodes.

  ## Examples

      iex> list_nodes()
      [%Node{}, ...]

  """
  def list_nodes do
    { :ok, result } = fetch()

    services = result["clusters"]
       |> Enum.flat_map(&(&1["services"]))
#      |> Enum.find(fn(val) -> val["type"] == "hosts" end)


    services
      |> Enum.group_by(&get_key(&1), &get_service_type(&1))
      |> Enum.sort_by(fn {host, _value} -> host end)
      |> Enum.with_index(1)
      |> Enum.map(fn {{host, value}, index} -> %Node{id: index, hostname: host, serviceTypes: value |> Enum.uniq |> Enum.sort } end)


  end

  def get_key(service) do
    service["host"]
  end

  def get_service_type(service) do
    service["serviceType"]
  end

  def fetch do
    case HTTPoison.get("http://gew1-searchvespaepisodeconfig-a-t7hp.gew1.spotify.net:19071/serviceview/v1") do
      {:ok, %{status_code: 200, body: body}} ->
        {:ok, Poison.decode!(body)}
      {:ok, %{status_code: 404}} ->
        {:error, :not_found}
      {:error, _err} ->
        {:error, :internal_server_error}
    end
  end

end
