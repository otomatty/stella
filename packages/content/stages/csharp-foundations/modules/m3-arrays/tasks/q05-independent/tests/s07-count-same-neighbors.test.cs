public class S07CountSameNeighborsTests
{
    [Fact(DisplayName = "S07 連続した同じ値")]
    public void S07CountSameNeighbors()
    {
        Assert.Equal(2, Answers.S07CountSameNeighbors(new int[] { 2, 2, 2, 5 }));
        Assert.Equal(0, Answers.S07CountSameNeighbors(new int[] { 4 }));
        Assert.Equal(0, Answers.S07CountSameNeighbors(new int[] { }));
        Assert.Equal(1, Answers.S07CountSameNeighbors(new int[] { 1, 1 }));
        Assert.Equal(2, Answers.S07CountSameNeighbors(new int[] { 1, 2, 2, 2 }));
    }
}
