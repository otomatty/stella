public class Q25CountZerosTests
{
    [Fact(DisplayName = "Q25 0の個数")]
    public void Q25CountZeros()
    {
        Assert.Equal(2, Answers.Q25CountZeros(new int[] { 0, 1, 0, 2 }));
        Assert.Equal(0, Answers.Q25CountZeros(new int[] { 1, 2, 3 }));
        Assert.Equal(1, Answers.Q25CountZeros(new int[] { 0 }));
    }
}
