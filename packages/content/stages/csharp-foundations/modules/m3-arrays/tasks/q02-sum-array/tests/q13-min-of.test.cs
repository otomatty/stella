public class Q13MinOfTests
{
    [Fact(DisplayName = "Q13 最小")]
    public void Q13MinOf()
    {
        Assert.Equal(3, Answers.Q13MinOf(new int[] { 3, 9, 4 }));
        Assert.Equal(3, Answers.Q13MinOf(new int[] { 11, 3, 4 }));
        Assert.Equal(5, Answers.Q13MinOf(new int[] { 5 }));
    }
}
