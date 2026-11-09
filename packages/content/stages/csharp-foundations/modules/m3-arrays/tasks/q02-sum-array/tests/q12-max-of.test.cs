public class Q12MaxOfTests
{
    [Fact(DisplayName = "Q12 最大")]
    public void Q12MaxOf()
    {
        Assert.Equal(9, Answers.Q12MaxOf(new int[] { 3, 9, 4 }));
        Assert.Equal(11, Answers.Q12MaxOf(new int[] { 11, 3, 4 }));
        Assert.Equal(5, Answers.Q12MaxOf(new int[] { 5 }));
    }
}
