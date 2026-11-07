public class Q27CountNegativesTests
{
    [Fact(DisplayName = "Q27 負の個数")]
    public void Q27CountNegatives()
    {
        Assert.Equal(2, Answers.Q27CountNegatives(new int[] { 3, -9, 4, -1 }));
        Assert.Equal(0, Answers.Q27CountNegatives(new int[] { 1, 2 }));
        Assert.Equal(1, Answers.Q27CountNegatives(new int[] { -1 }));
    }
}
