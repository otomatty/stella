public class Q30CountPositivesTests
{
    [Fact(DisplayName = "Q30 正の個数")]
    public void Q30CountPositives()
    {
        Assert.Equal(2, Answers.Q30CountPositives(new int[] { 3, -9, 0, 4 }));
        Assert.Equal(0, Answers.Q30CountPositives(new int[] { -1, 0 }));
        Assert.Equal(3, Answers.Q30CountPositives(new int[] { 1, 2, 3 }));
    }
}
